"use client";

import React, { useState } from "react";
import InputStep from "./components/InputStep";
import TitleReviewStep from "./components/TitleReviewStep";
import ProgressStep from "./components/ProgressStep";
import ResultsStep from "./components/ResultsStep";
import { useAppContext } from "@/context/AppContext";

type Step = 1 | 2 | 3 | 4;

const stepLabels = [
  { num: 1, label: "Configure" },
  { num: 2, label: "Review Titles" },
  { num: 3, label: "Generating" },
  { num: 4, label: "Results" },
];

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const { state, dispatch } = useAppContext();

  const handleRestart = () => {
    dispatch({ type: "RESET_BATCH" });
    setStep(1);
  };

  const selectedTitleCount = state.generatedTitles.filter((t) => t.selected).length;
  const doneCount = state.generationJobs.filter((j) => j.status === "done").length;
  const errorCount = state.generationJobs.filter((j) => j.status === "error").length;

  return (
    <main style={{ paddingBottom: "3rem" }}>
      {/* Header */}
      <header style={{ textAlign: "center", marginBottom: "1.25rem" }}>
        <h1 style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: "1.75rem", fontWeight: 800 }}>
          Bulk Content Generator
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
          Multi-keyword • 20 parallel threads • Mistral API
        </p>
      </header>

      {/* Step Indicator */}
      <div className="step-bar">
        {stepLabels.map((s) => (
          <div key={s.num} className={`step-item ${step === s.num ? "active" : step > s.num ? "done" : ""}`}>
            <span className="step-num">{step > s.num ? "✓" : s.num}</span>
            <span style={{ display: "inline-block" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Live Stats Bar - always visible */}
      <div className="stats-bar">
        <div className="stat-chip">🌐 <span className="stat-value">{state.language}</span></div>
        <div className="stat-chip">🔑 Keywords: <span className="stat-value">{state.keywords.length || 0}</span></div>
        <div className="stat-chip">📝 Prompts: <span className="stat-value">{state.selectedPromptIndices.length}</span></div>
        {state.generatedTitles.length > 0 && (
          <div className="stat-chip">📋 Titles: <span className="stat-value">{selectedTitleCount}/{state.generatedTitles.length}</span></div>
        )}
        {state.generationJobs.length > 0 && (
          <>
            <div className="stat-chip">✅ Done: <span className="stat-value">{doneCount}</span></div>
            {errorCount > 0 && <div className="stat-chip" style={{ borderColor: "var(--error)" }}>❌ Errors: <span className="stat-value" style={{ color: "var(--error)" }}>{errorCount}</span></div>}
          </>
        )}
        {state.articles.length > 0 && (
          <div className="stat-chip" style={{ borderColor: "var(--success)" }}>📄 Articles: <span className="stat-value" style={{ color: "var(--success)" }}>{state.articles.length}</span></div>
        )}
      </div>

      {/* Steps */}
      {step === 1 && <InputStep onNext={() => setStep(2)} />}
      {step === 2 && <TitleReviewStep onBack={() => setStep(1)} onNext={() => setStep(3)} />}
      {step === 3 && <ProgressStep onCancel={() => setStep(4)} onFinish={() => setStep(4)} />}
      {step === 4 && <ResultsStep onRestart={handleRestart} />}
    </main>
  );
}
