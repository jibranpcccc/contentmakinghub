"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAppContext } from "@/context/AppContext";

interface ProgressStepProps {
  onCancel: () => void;
  onFinish: () => void;
}

export default function ProgressStep({ onCancel, onFinish }: ProgressStepProps) {
  const { state, dispatch } = useAppContext();
  const [isDone, setIsDone] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const totalJobs = state.generationJobs.length;
  const completedJobs = state.generationJobs.filter((j) => j.status === "done" || j.status === "error").length;
  const runningJobs = state.generationJobs.filter((j) => j.status === "running").length;
  const queuedJobs = state.generationJobs.filter((j) => j.status === "queued").length;
  const pct = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ETA
  const eta = completedJobs > 0 && !isDone
    ? Math.round(((elapsed / completedJobs) * (totalJobs - completedJobs)))
    : 0;

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;
    const selectedTitles = state.generatedTitles.filter((t) => t.selected);

    const run = async () => {
      try {
        const res = await fetch("/api/generate-articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titles: selectedTitles.map((t) => ({ keyword: t.keyword, title: t.title })),
            prompts: state.prompts,
            selectedPromptIndices: state.selectedPromptIndices,
            language: state.language,
          }),
          signal: controller.signal,
        });
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let done = false;

        while (!done) {
          const { value, done: rd } = await reader.read();
          done = rd;
          if (!value) continue;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.replace("data: ", "").trim();
            if (!raw) continue;
            try {
              const ev = JSON.parse(raw);
              if (ev.type === "INIT") dispatch({ type: "INIT_GENERATION_JOBS", payload: ev.jobs });
              else if (ev.type === "UPDATE") {
                dispatch({ type: "UPDATE_JOB", payload: ev.job });
                if (ev.job.status === "error") setErrorCount((p) => p + 1);
              } else if (ev.type === "RESULT") {
                dispatch({ type: "UPDATE_JOB", payload: ev.job });
                dispatch({ type: "ADD_ARTICLE", payload: ev.article });
              } else if (ev.type === "DONE") setIsDone(true);
            } catch {}
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") console.error(err);
      }
    };
    run();
    return () => controller.abort();
  }, []);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Progress Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
          {isDone ? "✅ Generation Complete" : <><span className="pulse">⚡</span> Generating Articles...</>}
        </h2>
        <span style={{ fontFamily: "monospace", fontSize: "0.9rem", color: "var(--text-muted)" }}>
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Progress Bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.85rem" }}>
          <span style={{ fontWeight: 700 }}>{pct}%</span>
          <span style={{ color: "var(--text-muted)" }}>{completedJobs} of {totalJobs} done</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Live Stats */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <span className="badge badge-accent">🔄 Running: {runningJobs}</span>
        <span className="badge badge-muted">⏳ Queued: {queuedJobs}</span>
        <span className="badge badge-success">✅ Done: {completedJobs - errorCount}</span>
        {errorCount > 0 && <span className="badge badge-error">❌ Errors: {errorCount}</span>}
        {!isDone && eta > 0 && <span className="badge badge-muted">🕐 ETA: ~{formatTime(eta)}</span>}
      </div>

      {/* Job List */}
      <div style={{ maxHeight: "320px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {state.generationJobs.map((job) => {
          const titleObj = state.generatedTitles.filter((t) => t.selected)[job.titleIndex];
          const label = titleObj ? titleObj.title : `Job ${job.titleIndex + 1}`;
          const isErr = job.status === "error";
          const isRun = job.status === "running";
          const isDn = job.status === "done";

          return (
            <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.6rem", background: isRun ? "var(--accent-soft)" : "var(--bg-dark)", borderRadius: "var(--radius-sm)", borderLeft: `3px solid ${isErr ? "var(--error)" : isRun ? "var(--accent)" : isDn ? "var(--success)" : "transparent"}`, fontSize: "0.85rem" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{label}</span>
              <span style={{ fontWeight: 600, color: isErr ? "var(--error)" : isDn ? "var(--success)" : isRun ? "var(--accent)" : "var(--text-muted)", whiteSpace: "nowrap" }}>
                {job.status === "queued" && "Queued"}
                {isRun && <span className="pulse">Running...</span>}
                {isDn && "✓"}
                {isErr && "✕ Error"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        <button onClick={() => { abortRef.current?.abort(); onCancel(); }} className="btn-outlined" style={{ borderColor: "var(--error-soft)", color: "var(--error)" }} disabled={isDone}>
          Cancel
        </button>
        {isDone ? (
          <button onClick={onFinish} className="btn-success">
            📥 View Results & Download
          </button>
        ) : (
          <button disabled className="btn-primary" style={{ opacity: 0.5 }}>
            Waiting for completion...
          </button>
        )}
      </div>
    </div>
  );
}
