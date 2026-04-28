import { NextResponse } from "next/server";
import { callDeepSeek } from "@/lib/deepseek";
import { callMistral } from "@/lib/mistral";

function extractJSON(text: string): any {
  let clean = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  try { return JSON.parse(clean); } catch {}
  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
  return null;
}

export const runtime = "edge";

// Handles ONE keyword at a time — fast, no timeout issues
export async function POST(req: Request) {
  try {
    const { keyword, count, language, provider } = await req.json();
    const lang = language || "English";
    const num = Math.min(Math.max(Number(count) || 1, 1), 100);

    if (!keyword || typeof keyword !== "string") {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    const systemPrompt = `You generate unique, niche-specific article titles.
Write ALL titles in ${lang}.
Rules:
- Generate exactly ${num} titles for the keyword below. You MUST NOT stop early.
- Every title must be relevant to the "${keyword}" niche.
- Each title must have a DIFFERENT angle. Zero duplicates.
- 8-15 words, punchy, click-worthy. Include the keyword naturally.
- Mix: How-to, Top X, Why, Guide, Mistakes, Tips, Beginner's, Truth About.
- BANNED: Exploring, Delving, Unveiling, Navigating, Demystifying.
- Return ONLY a JSON object with a single key "titles" containing an array of strings. No other text.`;

    let content: string;
    if (provider === "mistral") {
      content = await callMistral(
        systemPrompt,
        `Keyword: "${keyword}" — generate exactly ${num} titles in ${lang}. Return JSON object {"titles": [...]}.`,
        { temperature: 0.9, max_tokens: 4000, response_format: { type: "json_object" } }
      );
    } else {
      content = await callDeepSeek(
        systemPrompt,
        `Keyword: "${keyword}" — generate exactly ${num} titles in ${lang}. Return JSON object {"titles": [...]}.`,
        { temperature: 0.9, max_tokens: 4000, response_format: { type: "json_object" } }
      );
    }

    let titles: string[] = [];
    const parsed = extractJSON(content);
    if (Array.isArray(parsed)) {
      titles = parsed.map((t: any) => String(t).trim()).filter((t: string) => t.length > 5);
    } else if (parsed && typeof parsed === "object") {
      for (const v of Object.values(parsed)) {
        if (Array.isArray(v)) { titles = (v as string[]).map((t: any) => String(t).trim()).filter((t: string) => t.length > 5); break; }
      }
    }
    if (titles.length === 0) {
      titles = content.split("\n")
        .map((l: string) => l.replace(/^[\d\.\)\-\*\s]+/, "").replace(/^["']|["']$/g, "").trim())
        .filter((l: string) => l.length > 15 && !l.startsWith("{") && !l.startsWith("[") && !l.includes("\":"));
    }

    // Deduplicate - Only remove exact matches or titles that are identical when stripped of punctuation
    const unique: string[] = [];
    const seen = new Set<string>();
    
    for (const t of titles) {
      // Normalize: lowercase and remove all non-alphanumeric characters for comparison
      const normalized = t.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(t);
      }
    }
    while (unique.length < num) unique.push(`${keyword} — Guide #${unique.length + 1}`);

    const finalTitles = unique.slice(0, num).map((t) => ({ keyword, title: t, selected: true }));
    return NextResponse.json({ titles: finalTitles });
  } catch (error: any) {
    console.error("Title generation error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
