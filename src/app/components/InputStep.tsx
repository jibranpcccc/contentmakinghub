"use client";

import React, { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { GeneratedTitle } from "@/lib/types";

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
  count: number;
  titlesGenerated: number;
}

export default function InputStep({ onNext }: InputStepProps) {
  const { state, dispatch } = useAppContext();
  const [keywordText, setKeywordText] = useState(state.keywords.join("\n"));
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customLang, setCustomLang] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [keywordStatuses, setKeywordStatuses] = useState<KeywordStatus[]>([]);
  const [totalDone, setTotalDone] = useState(0);
  const [totalKeywords, setTotalKeywords] = useState(0);

  const keywordCount = keywordText.split("\n").map((k) => k.trim()).filter((k) => k.length > 0).length;
  const isFormValid = keywordCount > 0 && state.totalArticles > 0 && state.language.length > 0;
  const titlesPerKeyword = keywordCount > 0 ? Math.max(1, Math.ceil(state.totalArticles / keywordCount)) : 0;

  const handleLanguageChange = (val: string) => {
    if (val === "Custom...") { setShowCustom(true); } else { setShowCustom(false); dispatch({ type: "SET_LANGUAGE", payload: val }); }
  };

  const handleGenerate = async () => {
    const keywords = [...new Set(keywordText.split("\n").map((k) => k.trim()).filter((k) => k.length > 0))].slice(0, 50);
    if (keywords.length === 0) return;
    dispatch({ type: "SET_KEYWORDS", payload: keywords });
    setIsGenerating(true);
    setError(null);
    setTotalDone(0);
    setTotalKeywords(keywords.length);

    // Init keyword statuses
    setKeywordStatuses(keywords.map((kw) => ({ keyword: kw, status: "waiting", count: 0, titlesGenerated: 0 })));

    const allTitles: GeneratedTitle[] = [];

    try {
      const res = await fetch("/api/generate-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, totalArticles: state.totalArticles, language: state.language }),
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
            if (ev.type === "KEYWORD_START") {
              setKeywordStatuses((prev) => prev.map((ks, i) =>
                ks.keyword === ev.keyword ? { ...ks, status: "generating", count: ev.count } : ks
              ));
            } else if (ev.type === "KEYWORD_DONE") {
              allTitles.push(...ev.titles);
              setTotalDone((p) => p + 1);
              setKeywordStatuses((prev) => prev.map((ks) =>
                ks.keyword === ev.keyword ? { ...ks, status: "done", titlesGenerated: ev.titles.length } : ks
              ));
            } else if (ev.type === "KEYWORD_ERROR") {
              allTitles.push(...ev.titles);
              setTotalDone((p) => p + 1);
              setKeywordStatuses((prev) => prev.map((ks) =>
                ks.keyword === ev.keyword ? { ...ks, status: "error", titlesGenerated: ev.titles.length } : ks
              ));
            } else if (ev.type === "DONE") {
              dispatch({ type: "SET_GENERATED_TITLES", payload: allTitles });
              onNext();
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setIsGenerating(false);
    }
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {error && (
        <div style={{ background: "var(--error-soft)", color: "var(--error)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.9rem" }}>
          ⚠ {error}
        </div>
      )}

      {/* Show progress when generating */}
      {isGenerating ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700 }}>
              <span className="pulse">⚡</span> Generating Titles...
            </h2>
            <span className="badge badge-accent">{totalDone} / {totalKeywords} keywords</span>
          </div>

          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${totalKeywords > 0 ? (totalDone / totalKeywords) * 100 : 0}%` }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: "350px", overflowY: "auto" }}>
            {keywordStatuses.map((ks, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.45rem 0.65rem", background: ks.status === "generating" ? "var(--accent-soft)" : "var(--bg-dark)",
                borderRadius: "var(--radius-sm)",
                borderLeft: `3px solid ${ks.status === "done" ? "var(--success)" : ks.status === "generating" ? "var(--accent)" : ks.status === "error" ? "var(--error)" : "transparent"}`,
                fontSize: "0.85rem",
              }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{ks.keyword}</span>
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                  {ks.status === "done" && <span className="badge badge-success">{ks.titlesGenerated} titles ✓</span>}
                  {ks.status === "generating" && <span className="badge badge-accent pulse">Generating...</span>}
                  {ks.status === "error" && <span className="badge badge-error">Error</span>}
                  {ks.status === "waiting" && <span className="badge badge-muted">Waiting</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Language Selection */}
          <div>
            <label className="field-label">🌐 Output Language</label>
            <select
              value={showCustom ? "Custom..." : state.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              style={{ width: "280px" }}
            >
              {PRESET_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
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
              {keywordCount > 0 && <> → <strong>{titlesPerKeyword} title{titlesPerKeyword !== 1 ? "s" : ""}</strong> per keyword</>}
            </p>
          </div>

          {/* Info */}
          <div style={{ background: "var(--accent-soft)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", fontSize: "0.85rem", color: "var(--accent)" }}>
            💡 50 unique article styles rotate automatically. Language: <strong>{state.language}</strong>
          </div>

          {/* Generate Button */}
          <button onClick={handleGenerate} disabled={!isFormValid} className="btn-primary"
            style={{ alignSelf: "stretch", justifyContent: "center", padding: "0.85rem", fontSize: "1rem" }}>
            🚀 Generate {state.totalArticles} Article Titles
          </button>
        </>
      )}
    </div>
  );
}
