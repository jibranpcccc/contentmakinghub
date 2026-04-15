"use client";

import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { GeneratedTitle, OutputFormat } from "@/lib/types";

interface InputStepProps {
  onNext: () => void;
}

const PRESET_LANGUAGES = [
  "English", "Thai (ไทย)", "Indonesian (Bahasa)", "Korean (한국어)", "Chinese (中文)",
  "Japanese (日本語)", "Vietnamese (Tiếng Việt)", "Hindi (हिन्दी)", "Spanish (Español)",
  "Portuguese (Português)", "Arabic (العربية)", "Russian (Русский)", "German (Deutsch)",
  "French (Français)", "Turkish (Türkçe)", "Malay (Melayu)", "Tagalog (Filipino)",
  "Custom..."
];

interface KeywordStatus {
  keyword: string;
  status: "waiting" | "generating" | "done" | "error";
  titles: string[];
  error?: string;
}

export default function InputStep({ onNext }: InputStepProps) {
  const { state, dispatch } = useAppContext();
  const [keywordText, setKeywordText] = useState(state.keywords.join("\n"));
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customLang, setCustomLang] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [keywordStatuses, setKeywordStatuses] = useState<KeywordStatus[]>([]);
  const [expandedKw, setExpandedKw] = useState<string | null>(null);

  const keywordCount = keywordText.split("\n").map((k) => k.trim()).filter((k) => k.length > 0).length;
  const isFormValid = keywordCount > 0 && state.totalArticles > 0 && state.language.length > 0;

  const handleLanguageChange = (val: string) => {
    if (val === "Custom...") { setShowCustom(true); } else { setShowCustom(false); dispatch({ type: "SET_LANGUAGE", payload: val }); }
  };

  const handleGenerate = async () => {
    const keywords = [...new Set(keywordText.split("\n").map((k) => k.trim()).filter((k) => k.length > 0))].slice(0, 50);
    if (keywords.length === 0) return;
    dispatch({ type: "SET_KEYWORDS", payload: keywords });
    setIsGenerating(true);
    setError(null);

    const total = state.totalArticles;
    const base = Math.floor(total / keywords.length);
    const remainder = total % keywords.length;

    // Init statuses
    const statuses: KeywordStatus[] = keywords.map((kw) => ({ keyword: kw, status: "waiting", titles: [] }));
    setKeywordStatuses(statuses);

    const allTitles: GeneratedTitle[] = [];

    // Process each keyword one by one (each call is fast, no timeout)
    for (let i = 0; i < keywords.length; i++) {
      const kw = keywords[i];
      const count = base + (i < remainder ? 1 : 0);
      if (count === 0) continue;

      setKeywordStatuses((prev) => prev.map((ks) =>
        ks.keyword === kw ? { ...ks, status: "generating" } : ks
      ));

      try {
        const res = await fetch("/api/generate-titles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: kw, count, language: state.language }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");

        const titles: GeneratedTitle[] = data.titles;
        allTitles.push(...titles);

        setKeywordStatuses((prev) => prev.map((ks) =>
          ks.keyword === kw ? { ...ks, status: "done", titles: titles.map((t) => t.title) } : ks
        ));
      } catch (err: any) {
        // Fallback titles
        for (let j = 0; j < count; j++) {
          allTitles.push({ keyword: kw, title: `${kw} Guide #${j + 1}`, selected: true });
        }
        setKeywordStatuses((prev) => prev.map((ks) =>
          ks.keyword === kw ? { ...ks, status: "error", error: err.message } : ks
        ));
      }
    }

    dispatch({ type: "SET_GENERATED_TITLES", payload: allTitles });
    setIsGenerating(false);
    onNext();
  };

  const totalDone = keywordStatuses.filter((ks) => ks.status === "done" || ks.status === "error").length;

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {error && (
        <div style={{ background: "var(--error-soft)", color: "var(--error)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem" }}>
          ⚠ {error}
        </div>
      )}

      {isGenerating ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
              <span className="pulse">⚡</span> Generating Titles...
            </h2>
            <span className="badge badge-accent">{totalDone} / {keywordStatuses.length} keywords</span>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${keywordStatuses.length > 0 ? (totalDone / keywordStatuses.length) * 100 : 0}%` }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "450px", overflowY: "auto" }}>
            {keywordStatuses.map((ks, i) => {
              const isExpanded = expandedKw === ks.keyword;
              return (
                <div key={i} style={{ background: ks.status === "generating" ? "var(--accent-soft)" : "var(--bg-dark)", borderRadius: "var(--radius-md)", borderLeft: `3px solid ${ks.status === "done" ? "var(--success)" : ks.status === "generating" ? "var(--accent)" : ks.status === "error" ? "var(--error)" : "transparent"}`, overflow: "hidden" }}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.7rem", cursor: ks.titles.length > 0 ? "pointer" : "default", fontSize: "0.85rem" }}
                    onClick={() => ks.titles.length > 0 && setExpandedKw(isExpanded ? null : ks.keyword)}
                  >
                    <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{ks.keyword}</span>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      {ks.status === "done" && (
                        <>
                          <span className="badge badge-success">{ks.titles.length} titles ✓</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{isExpanded ? "▲" : "▼"}</span>
                        </>
                      )}
                      {ks.status === "generating" && <span className="badge badge-accent pulse">Generating...</span>}
                      {ks.status === "error" && <span className="badge badge-error">Error</span>}
                      {ks.status === "waiting" && <span className="badge badge-muted">Waiting</span>}
                    </div>
                  </div>
                  {isExpanded && ks.titles.length > 0 && (
                    <div style={{ padding: "0 0.7rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                      {ks.titles.map((t, j) => (
                        <div key={j} style={{ fontSize: "0.8rem", color: "var(--text-secondary)", padding: "0.25rem 0.5rem", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)" }}>
                          {j + 1}. {t}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Output Format Selection */}
          <div>
            <label className="field-label">📄 Output Format</label>
            <select value={state.outputFormat} onChange={(e) => dispatch({ type: "SET_OUTPUT_FORMAT", payload: e.target.value as OutputFormat })} style={{ width: "280px" }}>
              <option value="markdown">Markdown (## headings, **bold**)</option>
              <option value="plain">Plain Text (no formatting)</option>
              <option value="html">HTML (headings only)</option>
              <option value="bbcode">BBCode (forum style)</option>
              <option value="wiki">Wiki (MediaWiki style)</option>
            </select>
            <p className="field-hint">Controls how headings and formatting appear in the generated articles.</p>
          </div>

          {/* Language Selection */}
          <div>
            <label className="field-label">🌐 Output Language</label>
            <select value={showCustom ? "Custom..." : state.language} onChange={(e) => handleLanguageChange(e.target.value)} style={{ width: "280px" }}>
              {PRESET_LANGUAGES.map((lang) => (<option key={lang} value={lang}>{lang}</option>))}
            </select>
            {showCustom && (
              <input type="text" placeholder="Type your language..." value={customLang}
                onChange={(e) => { setCustomLang(e.target.value); dispatch({ type: "SET_LANGUAGE", payload: e.target.value }); }}
                style={{ width: "280px", marginTop: "0.4rem" }} />
            )}
            <p className="field-hint">Titles and content will be generated in this language.</p>
          </div>

          {/* Article Count */}
          <div>
            <label className="field-label">How many articles do you need?</label>
            <input type="number" min={1} max={500} value={state.totalArticles}
              onChange={(e) => dispatch({ type: "SET_TOTAL_ARTICLES", payload: Math.max(1, parseInt(e.target.value) || 1) })}
              style={{ width: "160px" }} />
            <p className="field-hint">Each article will be 450–550 words. All 50 writing styles auto-rotate.</p>
          </div>

          {/* Keywords */}
          <div>
            <label className="field-label">Keywords (one per line, up to 50)</label>
            <textarea value={keywordText} onChange={(e) => setKeywordText(e.target.value)}
              placeholder={"machine learning basics\ndigital marketing tips\nhealthy meal prep"}
              rows={5} style={{ resize: "vertical", fontFamily: "monospace", fontSize: "0.9rem" }} />
            <p className="field-hint">
              {keywordCount} keyword{keywordCount !== 1 ? "s" : ""}
              {keywordCount > 0 && state.totalArticles > 0 && <> → <strong>~{Math.max(1, Math.ceil(state.totalArticles / keywordCount))} titles</strong> per keyword</>}
            </p>
          </div>

          <div style={{ background: "var(--accent-soft)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", fontSize: "0.85rem", color: "var(--accent)" }}>
            💡 50 unique article styles rotate automatically. Language: <strong>{state.language}</strong>
          </div>

          <button onClick={handleGenerate} disabled={!isFormValid} className="btn-primary"
            style={{ alignSelf: "stretch", justifyContent: "center", padding: "0.85rem", fontSize: "1rem" }}>
            🚀 Generate {state.totalArticles} Article Titles
          </button>
        </>
      )}
    </div>
  );
}
