import { NextResponse } from "next/server";
import { getMistralKeys } from "@/lib/mistral";
import { formatExactLink } from "@/lib/linkInjector";
import { OutputFormat } from "@/lib/types";

const BASE_QUALITY_RULES = `

CRITICAL OVERRIDE: You MUST adapt your writing to perfectly match the exact tone and audience implied by the Article Title. For example, if the title says "For Beginners", you MUST simplify the content and avoid advanced jargon, even if your role instructions suggest otherwise. The Title's intent always overrides any conflicting role instructions.

WRITING STANDARDS:
- NO TITLE IN OUTPUT: Do NOT output any title or heading on the first line. Do NOT repeat the article title anywhere in the text. Your very first word MUST be the opening sentence of the article hook.
- HOOK IMMEDIATELY: Open with a compelling stat, real-world pain point, or counter-intuitive reality. Zero fluff or introductory throat-clearing (never say "In this article...", "Welcome to...").
- VALUE & CONCRETE EXAMPLES: Hyper-specific to this niche. Include actionable techniques, realistic numbers/metrics, and concrete recommendations.
- SCANNABILITY: Use clear H2 subheadings for every main section, bullet points for lists, and bold text for key insights. Keep paragraphs short (2-3 sentences max).
- FORBIDDEN AI CLICHÉS: Never use: "Delving", "Unveiling", "Navigating", "Demystifying", "In today's fast-paced world", "It's important to note", "In conclusion", "Tapestry", "Beacon".
- ACTIONABLE CLOSE: End with an actionable "Key Takeaways" or "Next Steps" section. Do not mention rules or word counts.`;

export const runtime = "edge";

// Streams raw text back to the browser to ensure Netlify NEVER times out
export async function POST(req: Request) {
  try {
    const { title, keyword, url, exactMatchLink, prompt, language, outputFormat, workerIndex, targetWordCount } = await req.json();
    const lang = language || "English";
    const fmt = (outputFormat || "markdown") as OutputFormat;

    const cleanKeyword = String(keyword || "").trim() || "General Topic";
    const cleanUrl = typeof url === "string" ? url.trim() : "";
    const shouldLinkExact = Boolean(cleanUrl && exactMatchLink);
    const cleanTitle = String(title || "").trim() || `${cleanKeyword} Guide`;
    const cleanPrompt = String(prompt || "").trim() || "Act as an expert author. Write an insightful, comprehensive article about [topic].";

    const keys = getMistralKeys();
    
    if (keys.length === 0) return NextResponse.json({ error: "Missing API Key for Mistral" }, { status: 500 });

    // Build format instruction based on user selection
    let formatRule = "";
    switch (fmt) {
      case "plain":
        formatRule = "\nFORMAT: Write in plain text only. Do NOT use any markdown, HTML, or special formatting. Write headings as plain uppercase text on their own line. No #, no **, no tags.";
        break;
      case "html":
        formatRule = "\nFORMAT: Use HTML tags ONLY for headings (<h2> and <h3>). Everything else must be plain text with no HTML tags, no <p>, no <b>, no markdown. Just headings in HTML, rest is plain text.";
        break;
      case "bbcode":
        formatRule = "\nFORMAT: Use BBCode formatting. Headings as [h2]Heading[/h2] and [h3]Heading[/h3]. Bold as [b]text[/b]. No markdown, no HTML.";
        break;
      case "wiki":
        formatRule = "\nFORMAT: Use MediaWiki formatting. Headings as == Heading == and === Subheading ===. Bold as '''text'''. No markdown, no HTML.";
        break;
      case "markdown":
      default:
        formatRule = "\nFORMAT: Use Markdown formatting. Headings as ## and ###. Bold as **text**. Standard markdown.";
        break;
    }

    const parsedTarget = targetWordCount && targetWordCount !== "default" ? parseInt(targetWordCount, 10) : 700;
    const targetInt = Number.isFinite(parsedTarget) && parsedTarget >= 700 ? parsedTarget : 700;
    const wordRule = `CRITICAL LENGTH INSTRUCTION: Write at least ${targetInt} words (aim for ${targetInt}-${targetInt + 150} words). Ensure your article is sufficiently detailed to reach this length, and conclude naturally once the topic is thoroughly covered. Do not cut off mid-sentence.`;
    const userWordRule = `Target: ${targetInt}+ words. Ensure the full article is finished and not truncated.`;
    const calcMaxTokens = Math.min(4000, Math.max(1500, Math.round(targetInt * 1.7) + 250));

    let linkRule = "";
    if (shouldLinkExact) {
      const exactFormattedLink = formatExactLink(cleanKeyword, cleanUrl, fmt);
      linkRule = `\nHYPERLINK REQUIREMENT: You MUST include the exact-match keyword "${cleanKeyword}" hyperlinked to ${cleanUrl} EXACTLY ONCE naturally inside a body paragraph (NEVER inside any heading, and NEVER repeat the link more than once), using this EXACT syntax: ${exactFormattedLink}. Do NOT alter the anchor text "${cleanKeyword}" or the URL.`;
    }

    const systemPrompt = cleanPrompt
      .replace(/\[topic\]/gi, cleanKeyword)
      .replace(/\[keyword\]/gi, cleanKeyword) + BASE_QUALITY_RULES + `\n\n${wordRule}` + formatRule + linkRule + `\nLANGUAGE: Write the ENTIRE article in ${lang}. Every word must be in ${lang}.`;

    const apiUrl = "https://api.mistral.ai/v1/chat/completions";

    let dsResponse;
    let usedKey;
    let lastErrorMsg = "";
    let currentKeyIndex = typeof workerIndex === "number" ? workerIndex : Math.floor(Math.random() * keys.length);
    const maxRetries = Math.min(8, Math.max(5, keys.length));

    for (let i = 0; i < maxRetries; i++) {
      usedKey = keys[currentKeyIndex % keys.length];
      const model = i >= 4 ? "codestral-latest" : "voxtral-small-latest";

      const payload = {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `You are writing a blog article for a reader who searched for "${cleanKeyword}" and clicked on this title: "${cleanTitle}". Write the full article in ${lang}. ${userWordRule}${shouldLinkExact ? ` Include the exact-match hyperlink ${formatExactLink(cleanKeyword, cleanUrl, fmt)} naturally once in a body paragraph (not in a heading).` : ""} Make it highly relevant, specific, and useful to that reader.` },
        ],
        temperature: 0.75,
        top_p: 0.9,
        max_tokens: calcMaxTokens,
        stream: true,
      };
      
      dsResponse = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${usedKey}` },
        body: JSON.stringify(payload),
      });

      if (dsResponse.ok) {
        break;
      } else {
        lastErrorMsg = await dsResponse.text();
        console.error(`[Mistral API Error] Status: ${dsResponse.status} | Model: ${model} | Key: ...${usedKey?.slice(-4)} | WorkerIndex: ${workerIndex}`);
        currentKeyIndex++; // Try the next key on failure
      }
    }

    if (!dsResponse || !dsResponse.ok) {
      return NextResponse.json({ error: `Mistral Error: ${dsResponse?.status} - ${lastErrorMsg}` }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = dsResponse.body?.getReader();
          if (!reader) throw new Error("No reader");

          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep the last potentially incomplete line in the buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
                try {
                  const data = JSON.parse(trimmed.slice(6));
                  if (data.choices?.[0]?.delta?.content) {
                    controller.enqueue(encoder.encode(data.choices[0].delta.content));
                  }
                } catch (e) {}
              }
            }
          }
        } catch (err: any) {
             controller.enqueue(encoder.encode(`\n\n__STREAM_ERROR__: ${err.message}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
