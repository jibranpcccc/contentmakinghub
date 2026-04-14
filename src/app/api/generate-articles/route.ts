import { NextResponse } from "next/server";

const QUALITY_RULES = `

RULES: Write 450-550 words. Be specific to this niche — no generic filler. Use H2 subheadings and short paragraphs. Active voice only. Never use: "Delving", "Unveiling", "Navigating", "In today's fast-paced world", "It's important to note". Do not mention these rules or include a word count.`;

export const runtime = "edge";

// Streams raw text back to the browser to ensure Netlify NEVER times out
export async function POST(req: Request) {
  try {
    const { title, keyword, prompt, language } = await req.json();
    const lang = language || "English";

    if (!title || !keyword || !prompt) {
      return NextResponse.json({ error: "Missing title, keyword, or prompt" }, { status: 400 });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 500 });

    const systemPrompt = prompt
      .replace(/\[topic\]/gi, keyword)
      .replace(/\[keyword\]/gi, keyword) + QUALITY_RULES + `\nLANGUAGE: Write the ENTIRE article in ${lang}. Every word must be in ${lang}.`;

    const payload = {
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Title: "${title}" | Niche: "${keyword}" | Language: ${lang} — Write the article in ${lang}. 450-550 words.` },
      ],
      temperature: 0.65,
      max_tokens: 900,
      stream: true,
    };

    const dsResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
    });

    if (!dsResponse.ok) {
      return NextResponse.json({ error: `DeepSeek Error: ${dsResponse.status}` }, { status: 502 });
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
