"use client";

import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";

interface TitleReviewStepProps {
  onBack: () => void;
  onNext: () => void;
}

export default function TitleReviewStep({ onBack, onNext }: TitleReviewStepProps) {
  const { state, dispatch } = useAppContext();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const selectedCount = state.generatedTitles.filter((t) => t.selected).length;

  const grouped: Record<string, { index: number; title: string; selected: boolean }[]> = {};
  state.generatedTitles.forEach((t, i) => {
    if (!grouped[t.keyword]) grouped[t.keyword] = [];
    grouped[t.keyword].push({ index: i, title: t.title, selected: t.selected });
  });

  const startEdit = (index: number, current: string) => { setEditingIndex(index); setEditValue(current); };
  const saveEdit = (index: number) => {
    if (editValue.trim()) dispatch({ type: "EDIT_TITLE", payload: { index, newTitle: editValue.trim() } });
    setEditingIndex(null);
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className="btn-outlined" style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem" }} onClick={() => dispatch({ type: "SELECT_ALL_TITLES", payload: true })}>Select All</button>
          <button className="btn-outlined" style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem" }} onClick={() => dispatch({ type: "SELECT_ALL_TITLES", payload: false })}>Deselect All</button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className="badge badge-accent">{selectedCount} selected</span>
          <span className="badge badge-muted">{state.generatedTitles.length} total</span>
        </div>
      </div>

      <div style={{ maxHeight: "480px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {Object.entries(grouped).map(([keyword, items]) => {
          const selInGroup = items.filter((i) => i.selected).length;
          return (
            <div key={keyword}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{keyword}</span>
                <span className="badge badge-accent">{selInGroup}/{items.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {items.map(({ index, title, selected }) => (
                  <div key={index} style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.6rem", background: selected ? "var(--accent-soft)" : "var(--bg-dark)", border: `1px solid ${selected ? "var(--border-accent)" : "var(--border-light)"}`, borderRadius: "var(--radius-md)", transition: "all 100ms" }}>
                    <input type="checkbox" checked={selected} onChange={() => dispatch({ type: "TOGGLE_TITLE_SELECTION", payload: index })} style={{ width: "1rem", height: "1rem", cursor: "pointer" }} />
                    {editingIndex === index ? (
                      <div style={{ display: "flex", gap: "0.4rem", flex: 1 }}>
                        <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && saveEdit(index)} style={{ flex: 1, padding: "0.3rem 0.5rem", fontSize: "0.9rem" }} />
                        <button className="btn-primary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }} onClick={() => saveEdit(index)}>Save</button>
                      </div>
                    ) : (
                      <span style={{ flex: 1, cursor: "pointer", fontSize: "0.9rem", color: selected ? "var(--text-primary)" : "var(--text-muted)" }} onClick={() => startEdit(index, title)} title="Click to edit">{title}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        <button onClick={onBack} className="btn-outlined">← Back</button>
        <button onClick={onNext} disabled={selectedCount === 0} className="btn-primary">
          🚀 Generate {selectedCount} Articles
        </button>
      </div>
    </div>
  );
}
