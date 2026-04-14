"use client";

import React from "react";
import { useAppContext } from "@/context/AppContext";

export default function PromptList() {
  const { state, dispatch } = useAppContext();

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...state.prompts];
    newPrompts[index] = value;
    dispatch({ type: "SET_PROMPTS", payload: newPrompts });
  };

  const addPrompt = () => {
    if (state.prompts.length < 50) {
      dispatch({ type: "SET_PROMPTS", payload: [...state.prompts, ""] });
    }
  };

  const removePrompt = (index: number) => {
    if (state.prompts.length > 1) {
      const newPrompts = state.prompts.filter((_, i) => i !== index);
      dispatch({ type: "SET_PROMPTS", payload: newPrompts });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
      <h3>System Prompts ({state.prompts.length}/50)</h3>
      {state.prompts.map((prompt, index) => (
        <div key={index} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
          <span style={{ marginTop: "0.5rem", color: "var(--text-muted)" }}>{index + 1}.</span>
          <textarea
            value={prompt}
            onChange={(e) => handlePromptChange(index, e.target.value)}
            placeholder="e.g. Write a technical overview of this topic in a professional tone..."
            rows={3}
            style={{ flex: 1, resize: "vertical" }}
            maxLength={2000}
          />
          <button
            onClick={() => removePrompt(index)}
            disabled={state.prompts.length === 1}
            style={{
              padding: "0.5rem",
              background: state.prompts.length === 1 ? "var(--bg-surface-hover)" : "rgba(220, 38, 38, 0.2)",
              color: state.prompts.length === 1 ? "var(--text-muted)" : "#ef4444",
              borderRadius: "var(--radius-md)",
              cursor: state.prompts.length === 1 ? "not-allowed" : "pointer",
            }}
            title="Remove prompt"
          >
            ✕
          </button>
        </div>
      ))}
      {state.prompts.length < 50 && (
        <button onClick={addPrompt} className="btn-outlined" style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}>
          + Add Prompt
        </button>
      )}
    </div>
  );
}
