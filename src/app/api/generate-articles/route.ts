import { NextResponse } from "next/server";
import { callDeepSeek } from "@/lib/deepseek";
import PQueue from "p-queue";
import { v4 as uuidv4 } from "uuid";

// Tight, token-efficient quality wrapper
const QUALITY_RULES = `

RULES: Write 450-550 words. Be specific to this niche — no generic filler. Use H2 subheadings and short paragraphs. Active voice only. Never use: "Delving", "Unveiling", "Navigating", "In today's fast-paced world", "It's important to note". Do not mention these rules or include a word count.`;

export async function POST(req: Request) {
  try {
    const { titles, prompts, selectedPromptIndices, language } = await req.json();
    const lang = language || "English";

    if (!titles || titles.length === 0 || !prompts || selectedPromptIndices.length === 0) {
      return NextResponse.json({ error: "Missing titles, prompts, or indices" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        const queue = new PQueue({ concurrency: 20, interval: 100, intervalCap: 5 });
        req.signal.addEventListener("abort", () => queue.clear());

        const jobs = titles.map((t: any, i: number) => ({
          id: uuidv4(),
          titleIndex: i,
          promptIndex: selectedPromptIndices[i % selectedPromptIndices.length],
          keyword: t.keyword,
          title: t.title,
          status: "queued",
        }));

        send({ type: "INIT", jobs: jobs.map((j: any) => ({ id: j.id, titleIndex: j.titleIndex, promptIndex: j.promptIndex, status: "queued" })) });

        try {
          await Promise.all(
            jobs.map((job: any) =>
              queue.add(async () => {
                if (req.signal.aborted) return;
                send({ type: "UPDATE", job: { id: job.id, status: "running" } });

                try {
                  const rawPrompt = prompts[job.promptIndex];
                  const systemPrompt = rawPrompt
                    .replace(/\[topic\]/gi, job.keyword)
                    .replace(/\[keyword\]/gi, job.keyword) + QUALITY_RULES + `\nLANGUAGE: Write the ENTIRE article in ${lang}. Every word must be in ${lang}.`;

                  const content = await callDeepSeek(
                    systemPrompt,
                    `Title: "${job.title}" | Niche: "${job.keyword}" | Language: ${lang} — Write the article in ${lang}. 450-550 words.`,
                    { max_tokens: 900 }
                  );

                  send({
                    type: "RESULT",
                    job: { id: job.id, status: "done" },
                    article: {
                      id: job.id,
                      title: job.title,
                      keyword: job.keyword,
                      promptUsed: rawPrompt.split(":")[0],
                      content,
                      generatedAt: Date.now(),
                    },
                  });
                } catch (err: any) {
                  send({ type: "UPDATE", job: { id: job.id, status: "error", error: err.message } });
                }
              })
            )
          );
        } catch (e) {
          console.error("Queue error", e);
        } finally {
          send({ type: "DONE" });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Generation startup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
