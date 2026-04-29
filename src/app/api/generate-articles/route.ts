import { NextResponse } from "next/server";

const QUALITY_RULES = `

CRITICAL OVERRIDE: You MUST adapt your writing to perfectly match the exact tone and audience implied by the Article Title. For example, if the title says "For Beginners", you MUST simplify the content and avoid advanced jargon, even if your role instructions suggest otherwise. The Title's intent always overrides any conflicting role instructions.

RULES: Write exactly 500-600 words — not more, not less. Be hyper-specific to this niche — zero generic filler. Use H2 subheadings and short punchy paragraphs (2-3 sentences max). Active voice only. Every sentence must deliver value. Never use: "Delving", "Unveiling", "Navigating", "In today's fast-paced world", "It's important to note", "In conclusion". Do not mention these rules or include a word count.`;

export const runtime = "edge";

// Streams raw text back to the browser to ensure Netlify NEVER times out
export async function POST(req: Request) {
  try {
    const { title, keyword, prompt, language, outputFormat, provider, workerIndex } = await req.json();
    const lang = language || "English";
    const fmt = outputFormat || "markdown";

    if (!title || !keyword || !prompt) {
      return NextResponse.json({ error: "Missing title, keyword, or prompt" }, { status: 400 });
    }

    const rawKeys = [
      process.env.MISTRAL_API_KEY,
      process.env.MISTRAL_API_KEY_1,
      process.env.MISTRAL_API_KEY_2,
      process.env.MISTRAL_API_KEY_3,
      process.env.MISTRAL_API_KEY_4,
      process.env.MISTRAL_API_KEY_5,
      process.env.MISTRAL_API_KEY_6,
      process.env.MISTRAL_API_KEY_7,
      process.env.MISTRAL_API_KEY_8,
      process.env.MISTRAL_API_KEY_9,
      process.env.MISTRAL_API_KEY_10,
      process.env.MISTRAL_API_KEY_11,
      process.env.MISTRAL_API_KEY_12,
      process.env.MISTRAL_API_KEY_13,
      process.env.MISTRAL_API_KEY_14,
      process.env.MISTRAL_API_KEY_15,
      process.env.MISTRAL_API_KEY_16,
      process.env.MISTRAL_API_KEY_17,
      process.env.MISTRAL_API_KEY_18,
      process.env.MISTRAL_API_KEY_19,
      process.env.MISTRAL_API_KEY_20,
    ];
    
    const keys = rawKeys.filter(k => k && k !== "your_mistral_api_key_here") as string[];
    
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

    const systemPrompt = prompt
      .replace(/\[topic\]/gi, keyword)
      .replace(/\[keyword\]/gi, keyword) + QUALITY_RULES + formatRule + `\nLANGUAGE: Write the ENTIRE article in ${lang}. Every word must be in ${lang}.`;

    const payload = {
      model: "mistral-large-latest",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `You are writing a blog article for a reader who searched for "${keyword}" and clicked on this title: "${title}". Write the full article in ${lang}. Target: 500-600 words. Make it highly relevant, specific, and useful to that reader.` },
      ],
      temperature: 0.75,
      top_p: 0.9,
      max_tokens: 1000,
      stream: true,
    };

    const apiUrl = "https://api.mistral.ai/v1/chat/completions";

    let dsResponse;
    let usedKey;
    let lastErrorMsg = "";
    let currentKeyIndex = typeof workerIndex === "number" ? workerIndex : Math.floor(Math.random() * keys.length);
    const maxRetries = 3;

    for (let i = 0; i < maxRetries; i++) {
      usedKey = keys[currentKeyIndex % keys.length];
      
      dsResponse = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${usedKey}` },
        body: JSON.stringify(payload),
      });

      if (dsResponse.ok) {
        break;
      } else {
        lastErrorMsg = await dsResponse.text();
        console.error(`[Mistral API Error] Status: ${dsResponse.status} | Key: ...${usedKey?.slice(-4)} | WorkerIndex: ${workerIndex}`);
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

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ") && line !== "data: [DONE]") {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.choices?.[0]?.delta?.content) {
                    // Send actual words directly to client stream over HTTP
                    controller.enqueue(encoder.encode(data.choices[0].delta.content));
                  }
                } catch (e) {}
              }
            }
          }
        } catch (err: any) {
             controller.enqueue(encoder.encode(`\n\nERROR: ${err.message}`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: { "Content-Type": "text/plain" } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
