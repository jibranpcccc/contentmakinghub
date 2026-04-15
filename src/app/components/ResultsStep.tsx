"use client";

import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Article } from "@/lib/types";
import { generateZip, generateCSV } from "@/lib/export";

interface ResultsStepProps {
  onRestart: () => void;
}

export default function ResultsStep({ onRestart }: ResultsStepProps) {
  const { state } = useAppContext();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? state.articles.filter(
        (a) => a.title.toLowerCase().includes(filter.toLowerCase()) || a.keyword.toLowerCase().includes(filter.toLowerCase())
      )
    : state.articles;

  const uniqueKeywords = new Set(state.articles.map((a) => a.keyword));
  const totalWords = state.articles.reduce((sum, a) => sum + a.content.split(/\s+/).length, 0);

  const getFormattedTitle = (title: string, format: string) => {
    if (format === "plain") return `${title}`;
    if (format === "html") return `<h1>${title}</h1>`;
    if (format === "bbcode") return `[h1]${title}[/h1]`;
    if (format === "wiki") return `= ${title} =`;
    return `# ${title}`;
  };

  const copyArticle = async (article: Article) => {
    try {
      const topTitle = getFormattedTitle(article.title, state.outputFormat);
      await navigator.clipboard.writeText(`${topTitle}\n\n${article.content}`);
      setCopiedId(article.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const copyAll = async () => {
    const allText = state.articles.map((a) => `${getFormattedTitle(a.title, state.outputFormat)}\n\n${a.content}`).join("\n\n---\n\n");
    try {
      await navigator.clipboard.writeText(allText);
      setCopiedId("ALL");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Summary Card */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>📄 Generated Articles</h2>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className="badge badge-success" style={{ fontSize: "0.85rem", padding: "0.3rem 0.7rem" }}>
            {state.articles.length} articles
          </span>
          <span className="badge badge-accent" style={{ fontSize: "0.85rem", padding: "0.3rem 0.7rem" }}>
            {uniqueKeywords.size} keywords
          </span>
          <span className="badge badge-muted" style={{ fontSize: "0.85rem", padding: "0.3rem 0.7rem" }}>
            ~{totalWords.toLocaleString()} words total
          </span>
        </div>

        {/* BIG Download Buttons */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn-success" style={{ flex: 1, minWidth: "200px" }} onClick={() => generateZip(state.articles, state.outputFormat)}>
            📦 Download ZIP ({state.articles.length} files)
          </button>
          <button className="btn-primary" style={{ flex: 1, minWidth: "200px" }} onClick={() => generateCSV(state.articles, state.outputFormat)}>
            📊 Download CSV
          </button>
          <button className="btn-outlined" style={{ flex: 1, minWidth: "200px" }} onClick={copyAll}>
            {copiedId === "ALL" ? "✓ Copied All!" : `📋 Copy All to Clipboard`}
          </button>
        </div>
      </div>

      {/* Filter & Article List */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <input
          type="text"
          placeholder="🔍 Filter by title or keyword..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <p className="field-hint" style={{ margin: 0 }}>Showing {filtered.length} of {state.articles.length} articles. Click to expand.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "600px", overflowY: "auto" }}>
          {filtered.map((article) => {
            const isExpanded = expandedId === article.id;
            const wordCount = article.content.split(/\s+/).length;
            return (
              <div key={article.id} style={{ background: "var(--bg-dark)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
                <div
                  style={{ padding: "0.65rem 0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", gap: "0.5rem" }}
                  onClick={() => setExpandedId(isExpanded ? null : article.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{article.title}</h4>
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                      <span className="badge badge-accent">{article.keyword}</span>
                      <span className="badge badge-muted">{article.promptUsed}</span>
                      <span className="badge badge-muted">{wordCount} words</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexShrink: 0 }}>
                    <button
                      className="btn-outlined"
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={(e) => { e.stopPropagation(); copyArticle(article); }}
                    >
                      {copiedId === article.id ? "✓" : "Copy"}
                    </button>
                    <span style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 150ms", color: "var(--text-muted)" }}>▼</span>
                  </div>
                </div>
                {isExpanded && (
                  <div style={{ padding: "0.85rem", borderTop: "1px solid var(--border-light)", background: "var(--bg-surface)", whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: "1.75" }}>
                    {article.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <button onClick={onRestart} className="btn-outlined">← Start New Batch</button>
        <button className="btn-success" onClick={() => generateZip(state.articles, state.outputFormat)}>📦 Download All</button>
      </div>
    </div>
  );
}
