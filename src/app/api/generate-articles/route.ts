import { NextResponse } from "next/server";
import { callDeepSeek } from "@/lib/deepseek";

const QUALITY_RULES = `

RULES: Write 450-550 words. Be specific to this niche — no generic filler. Use H2 subheadings and short paragraphs. Active voice only. Never use: "Delving", "Unveiling", "Navigating", "In today's fast-paced world", "It's important to note". Do not mention these rules or include a word count.`;

// Handles ONE article at a time — no timeout issues
export async function POST(req: Request) {
  try {
    const { title, keyword, prompt, language } = await req.json();
    const lang = language || "English";

    if (!title || !keyword || !prompt) {
      return NextResponse.json({ error: "Missing title, keyword, or prompt" }, { status: 400 });
    }

    const systemPrompt = prompt
      .replace(/\[topic\]/gi, keyword)
      .replace(/\[keyword\]/gi, keyword) + QUALITY_RULES + `\nLANGUAGE: Write the ENTIRE article in ${lang}. Every word must be in ${lang}.`;

    const content = await callDeepSeek(
      systemPrompt,
      `Title: "${title}" | Niche: "${keyword}" | Language: ${lang} — Write the article in ${lang}. 450-550 words.`,
      { max_tokens: 900 }
    );

    return NextResponse.json({
      title,
      keyword,
      promptUsed: prompt.split(":")[0],
      content,
      generatedAt: Date.now(),
    });
  } catch (error: any) {
    console.error("Article generation error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
