import { NextResponse } from "next/server";
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

// Handles ONE keyword at a time with parallel sub-batching — fast, ultra-reliable, zero timeout
export async function POST(req: Request) {
  try {
    const { keyword, count, language } = await req.json();
    const lang = language || "English";
    const num = Math.min(Math.max(Number(count) || 1, 1), 200);

    if (!keyword || typeof keyword !== "string" || !keyword.trim()) {
      return NextResponse.json({ error: "Keyword is required" }, { status: 400 });
    }

    const cleanKeyword = keyword.trim();

    // Chunk requests into sub-batches of max 20 for fast parallel processing and zero truncation
    const BATCH_SIZE = 20;
    const batchCounts: number[] = [];
    let remaining = num;
    while (remaining > 0) {
      const take = Math.min(remaining, BATCH_SIZE);
      const targetTake = Math.min(take + 4, 25);
      batchCounts.push(targetTake);
      remaining -= take;
    }

    const angles = [
      "How-to, Practical Step-by-Step, Actionable Methods",
      "Top X Listicle, Essential Tools, Proven Techniques",
      "Common Mistakes to Avoid, Critical Warnings, Pitfalls",
      "Industry Secrets, Counter-Intuitive Truths, Behind-the-Scenes",
      "Beginner to Advanced Roadmap, Ultimate Frameworks, Strategies"
    ];

    const batchPromises = batchCounts.map(async (batchCount, bIdx) => {
      const angle = angles[bIdx % angles.length];
      const systemPrompt = `You generate unique, click-worthy article titles for blog/PBN websites.
Write ALL titles in ${lang}.
Focus heavily on these angles: ${angle}.
Rules:
- Generate exactly ${batchCount} distinct, compelling titles for the keyword.
- Every title must be directly relevant to "${cleanKeyword}".
- 8-15 words, punchy, click-worthy. Include the keyword naturally.
- BANNED: Exploring, Delving, Unveiling, Navigating, Demystifying.
- Return ONLY a JSON object with key "titles": ["..."] containing an array of strings. No other text.`;

      const userMsg = `Keyword: "${cleanKeyword}" — generate exactly ${batchCount} unique titles in ${lang}. Focus on: ${angle}. Return JSON {"titles": [...]}.`;

      try {
        const content = await callMistral(
          systemPrompt,
          userMsg,
          { temperature: 0.9, max_tokens: Math.max(800, batchCount * 45), response_format: { type: "json_object" } }
        );

        let parsedTitles: string[] = [];
        const parsed = extractJSON(content);
        if (Array.isArray(parsed)) {
          parsedTitles = parsed.map((t: any) => String(t).trim()).filter((t: string) => t.length > 5);
        } else if (parsed && typeof parsed === "object") {
          for (const v of Object.values(parsed)) {
            if (Array.isArray(v)) {
              parsedTitles = (v as string[]).map((t: any) => String(t).trim()).filter((t: string) => t.length > 5);
              break;
            }
          }
        }
        if (parsedTitles.length === 0) {
          parsedTitles = content.split("\n")
            .map((l: string) => l.replace(/^[\d\.\)\-\*\s]+/, "").replace(/^["']|["']$/g, "").trim())
            .filter((l: string) => l.length > 10 && !l.startsWith("{") && !l.startsWith("[") && !l.includes("\":"));
        }
        return parsedTitles;
      } catch (err) {
        console.error(`Title batch ${bIdx} failed:`, err);
        return [];
      }
    });

    const results = await Promise.all(batchPromises);
    const allTitles = results.flat();

    // Deduplicate
    const unique: string[] = [];
    const seen = new Set<string>();
    
    for (const t of allTitles) {
      const normalized = t.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (normalized.length > 5 && !seen.has(normalized)) {
        seen.add(normalized);
        unique.push(t);
      }
    }

    // Dynamic fallback if any gap remains
    const fallbackTemplates = [
      "The Practical Guide to Master",
      "Essential Strategies for Success in",
      "Proven Methods to Dominate",
      "Crucial Mistakes You Must Avoid in",
      "The Expert Playbook for",
      "How Top Professionals Approach",
      "Actionable Techniques for Better Results in",
      "The No-Nonsense Blueprint to",
      "Key Steps to Maximize ROI with",
      "High-Impact Tactics for"
    ];
    let fbIdx = 0;
    while (unique.length < num) {
      const template = fallbackTemplates[fbIdx % fallbackTemplates.length];
      const candidate = `${template} ${cleanKeyword} (Part ${Math.floor(fbIdx / fallbackTemplates.length) + 1})`;
      const norm = candidate.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(norm)) {
        seen.add(norm);
        unique.push(candidate);
      }
      fbIdx++;
    }

    const finalTitles = unique.slice(0, num).map((t) => ({ keyword: cleanKeyword, title: t, selected: true }));
    return NextResponse.json({ titles: finalTitles });
  } catch (error: any) {
    console.error("Title generation error:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}
