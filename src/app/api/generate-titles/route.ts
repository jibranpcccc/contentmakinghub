import { callDeepSeek } from "@/lib/deepseek";

function extractJSON(text: string): any {
  let clean = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  try { return JSON.parse(clean); } catch {}
  const objMatch = clean.match(/\{[\s\S]*\}/);
  if (objMatch) { try { return JSON.parse(objMatch[0]); } catch {} }
  const arrMatch = clean.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
  return null;
}

export async function POST(req: Request) {
  const { keywords, totalArticles, language } = await req.json();
  const lang = language || "English";

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return new Response(JSON.stringify({ error: "At least one keyword required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const total = Math.min(Math.max(Number(totalArticles) || 1, 1), 500);

  const base = Math.floor(total / keywords.length);
  const remainder = total % keywords.length;
  const distribution = keywords.map((kw: string, i: number) => ({
    keyword: kw,
    count: base + (i < remainder ? 1 : 0),
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "INIT", total: distribution.length });

      for (let idx = 0; idx < distribution.length; idx++) {
        const d = distribution[idx];
        if (d.count === 0) continue;

        send({ type: "KEYWORD_START", keyword: d.keyword, index: idx, count: d.count });

        const systemPrompt = `You generate unique, niche-specific article titles.
Write ALL titles in ${lang}.
Rules:
- Generate exactly ${d.count} titles for the keyword below.
- Every title must be relevant to the "${d.keyword}" niche.
- Each title must have a DIFFERENT angle. Zero duplicates.
- 8-15 words, punchy, click-worthy. Include the keyword naturally.
- Mix: How-to, Top X, Why, Guide, Mistakes, Tips, Beginner's, Truth About.
- BANNED: Exploring, Delving, Unveiling, Navigating, Demystifying.
- Return ONLY a JSON array of strings. No other text.`;

        try {
          const content = await callDeepSeek(
            systemPrompt,
            `Keyword: "${d.keyword}" — generate exactly ${d.count} titles in ${lang}. Return JSON array only.`,
            { temperature: 0.9, max_tokens: d.count * 50 + 200 }
          );

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

          const unique: string[] = [];
          for (const t of titles) {
            const lower = t.toLowerCase();
            const isDupe = unique.some((e) => { const w1 = lower.split(/\s+/).slice(0, 5).join(" "); const w2 = e.toLowerCase().split(/\s+/).slice(0, 5).join(" "); return w1 === w2; });
            if (!isDupe) unique.push(t);
          }
          while (unique.length < d.count) unique.push(`${d.keyword} — Guide #${unique.length + 1}`);
          const finalTitles = unique.slice(0, d.count).map((t) => ({ keyword: d.keyword, title: t, selected: true }));

          send({ type: "KEYWORD_DONE", keyword: d.keyword, index: idx, titles: finalTitles });
        } catch (err: any) {
          const fallback = Array.from({ length: d.count }, (_, j) => ({ keyword: d.keyword, title: `${d.keyword} Guide #${j + 1}`, selected: true }));
          send({ type: "KEYWORD_ERROR", keyword: d.keyword, index: idx, error: err.message, titles: fallback });
        }
      }

      send({ type: "DONE" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
