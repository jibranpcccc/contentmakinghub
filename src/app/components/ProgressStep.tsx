"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAppContext } from "@/context/AppContext";
import { v4 as uuidv4 } from "uuid";

interface ProgressStepProps {
  onCancel: () => void;
  onFinish: () => void;
}

interface JobStatus {
  id: string;
  title: string;
  keyword: string;
  promptIndex: number;
  status: "queued" | "running" | "done" | "error";
  error?: string;
}

export default function ProgressStep({ onCancel, onFinish }: ProgressStepProps) {
  const { state, dispatch } = useAppContext();
  const [isDone, setIsDone] = useState(false);
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const cancelledRef = useRef(false);

  const completedJobs = jobs.filter((j) => j.status === "done" || j.status === "error").length;
  const runningJobs = jobs.filter((j) => j.status === "running").length;
  const queuedJobs = jobs.filter((j) => j.status === "queued").length;
  const errorCount = jobs.filter((j) => j.status === "error").length;
  const totalJobs = jobs.length;
  const pct = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const eta = completedJobs > 0 && !isDone ? Math.round((elapsed / completedJobs) * (totalJobs - completedJobs)) : 0;

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  useEffect(() => {
    const selectedTitles = state.generatedTitles.filter((t) => t.selected);

    // Create jobs
    const newJobs: JobStatus[] = selectedTitles.map((t, i) => ({
      id: uuidv4(),
      title: t.title,
      keyword: t.keyword,
      promptIndex: state.selectedPromptIndices[i % state.selectedPromptIndices.length],
      status: "queued" as const,
    }));
    setJobs(newJobs);

    // Also init in global state for tracking
    dispatch({
      type: "INIT_GENERATION_JOBS",
      payload: newJobs.map((j, i) => ({ id: j.id, titleIndex: i, promptIndex: j.promptIndex, status: "queued" })),
    });

    // Process with client-side concurrency (20 parallel threads)
    const CONCURRENCY = 20;
    let nextIndex = 0;

    const processOne = async (jobIndex: number) => {
      if (cancelledRef.current) return;
      const job = newJobs[jobIndex];

      // Update to running
      setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "running" } : j));
      dispatch({ type: "UPDATE_JOB", payload: { id: job.id, status: "running" } });

      try {
        const res = await fetch("/api/generate-articles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: job.title,
            keyword: job.keyword,
            prompt: state.prompts[job.promptIndex],
            language: state.language,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || "Failed");
        }
        
        if (!res.body) throw new Error("No response body");

        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let fullContent = "";
        let doneReading = false;

        while (!doneReading && !cancelledRef.current) {
          const { value, done: rd } = await reader.read();
          doneReading = rd;
          if (value) {
            fullContent += decoder.decode(value, { stream: true });
          }
        }
        
        if (fullContent.includes("ERROR:")) throw new Error(fullContent.split("ERROR:")[1].trim());

        // Update to done
        setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "done" } : j));
        dispatch({ type: "UPDATE_JOB", payload: { id: job.id, status: "done" } });
        dispatch({
          type: "ADD_ARTICLE",
          payload: { id: job.id, title: job.title, keyword: job.keyword, promptUsed: state.prompts[job.promptIndex].split(":")[0], content: fullContent, generatedAt: Date.now() },
        });
      } catch (err: any) {
        setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, status: "error", error: err.message } : j));
        dispatch({ type: "UPDATE_JOB", payload: { id: job.id, status: "error", error: err.message } });
      }
    };

    const runQueue = async () => {
      const workers = Array.from({ length: CONCURRENCY }, async () => {
        while (true) {
          const idx = nextIndex++;
          if (idx >= newJobs.length || cancelledRef.current) break;
          await processOne(idx);
        }
      });
      await Promise.all(workers);
      if (!cancelledRef.current) setIsDone(true);
    };

    runQueue();
  }, []);

  const handleCancel = () => {
    cancelledRef.current = true;
    setIsDone(true);
    onCancel();
  };

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
        {jobs.map((job) => {
          const isErr = job.status === "error";
          const isRun = job.status === "running";
          const isDn = job.status === "done";
          return (
            <div key={job.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.4rem 0.6rem", background: isRun ? "var(--accent-soft)" : "var(--bg-dark)", borderRadius: "var(--radius-sm)", borderLeft: `3px solid ${isErr ? "var(--error)" : isRun ? "var(--accent)" : isDn ? "var(--success)" : "transparent"}`, fontSize: "0.85rem" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>{job.title}</span>
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
        <button onClick={handleCancel} className="btn-outlined" style={{ borderColor: "var(--error-soft)", color: "var(--error)" }} disabled={isDone}>
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
