import { OutputFormat } from "./types";

export function formatExactLink(keyword: string, url: string, format: OutputFormat): string {
  switch (format) {
    case "html":
      return `<a href="${url}">${keyword}</a>`;
    case "bbcode":
      return `[url=${url}]${keyword}[/url]`;
    case "wiki":
      return `[${url} ${keyword}]`;
    case "plain":
      return `${keyword} (${url})`;
    case "markdown":
    default:
      return `[${keyword}](${url})`;
  }
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isHeadingLine(line: string, format: OutputFormat): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (/^#{1,6}\s/.test(trimmed)) return true;
  if (format === "html" && /^<h[1-6][\s>]/i.test(trimmed)) return true;
  if (format === "bbcode" && /^\[h[1-6]\]/i.test(trimmed)) return true;
  if (format === "wiki" && /^=+.+=+$/.test(trimmed)) return true;
  if (format === "plain" && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.length < 100) return true;
  return false;
}

function buildLinkRegex(url: string, format: OutputFormat): RegExp {
  const escapedUrl = escapeRegExp(url);
  switch (format) {
    case "html":
      return new RegExp(`<a\\s+[^>]*href=["']${escapedUrl}["'][^>]*>(.*?)</a>`, "gi");
    case "bbcode":
      return new RegExp(`\\[url=${escapedUrl}\\](.*?)\\[/url\\]`, "gi");
    case "wiki":
      return new RegExp(`\\[${escapedUrl}\\s+([^\\]]+)\\]`, "gi");
    case "plain":
      return new RegExp(`([^\\s]+(?:\\s+[^\\s]+)*?)\\s*\\(${escapedUrl}\\)`, "gi");
    case "markdown":
    default:
      return new RegExp(`\\[([^\\]]+)\\]\\(${escapedUrl}\\)`, "gi");
  }
}

/**
 * Ensures the generated article contains a 100% exact-match hyperlinked keyword
 * pointing to `url` in the selected `format`:
 * - Strips any link to `url` from heading lines.
 * - Deduplicates so the link appears EXACTLY ONCE in the body.
 * - Injects the exact-match link naturally in a body paragraph if missing.
 */
export function ensureExactMatchHyperlink(
  content: string,
  keyword: string,
  url: string,
  format: OutputFormat
): string {
  const cleanKw = keyword.trim();
  const cleanUrl = url.trim();
  if (!cleanKw || !cleanUrl || !content.trim()) return content;

  const exactLink = formatExactLink(cleanKw, cleanUrl, format);
  const linkRegex = buildLinkRegex(cleanUrl, format);
  const lines = content.split("\n");

  let keptBodyLink = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isHeadingLine(line, format)) {
      // Never allow hyperlinks inside headings — unwrap to anchor text
      lines[i] = line.replace(linkRegex, (_, inner) => inner || cleanKw);
      continue;
    }

    if (linkRegex.test(line)) {
      linkRegex.lastIndex = 0;
      lines[i] = line.replace(linkRegex, () => {
        if (!keptBodyLink) {
          keptBodyLink = true;
          return exactLink;
        }
        return cleanKw;
      });
    }
  }

  if (keptBodyLink) {
    return lines.join("\n");
  }

  // No valid body link found — link the first plain-text exact keyword occurrence in a middle body paragraph (after first heading if possible)
  const escapedKw = escapeRegExp(cleanKw);
  const isAsciiWord = /^[a-z0-9]/i.test(cleanKw) && /[a-z0-9]$/i.test(cleanKw);
  const kwPattern = isAsciiWord
    ? new RegExp(`(?<![\\w\\[/="'])${escapedKw}(?![\\w\\]"'])`, "i")
    : new RegExp(escapedKw, "i");

  const firstHeadingIdx = lines.findIndex((l) => isHeadingLine(l, format) && l.trim().length > 0);
  const startSearchIdx = firstHeadingIdx !== -1 ? firstHeadingIdx + 1 : 0;

  for (const searchFrom of [startSearchIdx, 0]) {
    for (let i = searchFrom; i < lines.length; i++) {
      const line = lines[i];
      if (isHeadingLine(line, format)) continue;
      if (line.includes(cleanUrl)) continue;

      if (kwPattern.test(line)) {
        lines[i] = line.replace(kwPattern, exactLink);
        return lines.join("\n");
      }
    }
  }

  // Fallback: build a grammatically natural sentence for the anchor type
  const lowerKw = cleanKw.toLowerCase();
  let naturalSentence = `For additional context, see this resource on ${exactLink}.`;
  if (lowerKw.startsWith("read more")) {
    naturalSentence = `You can ${exactLink} to explore these developments in greater detail.`;
  } else if (/^[a-z0-9-]+\.[a-z]{2,}(\.[a-z]{2,})?$/i.test(cleanKw)) {
    naturalSentence = `Coverage on ${exactLink} highlights how these strategies are being applied in practice.`;
  } else if (cleanKw.split(/\s+/).length >= 6) {
    naturalSentence = `As outlined in ${exactLink}, these approaches continue to evolve rapidly.`;
  }

  for (const searchFrom of [startSearchIdx, 0]) {
    for (let i = searchFrom; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (isHeadingLine(trimmed, format)) continue;
      if (trimmed.length >= 60) {
        const separator = /[.!?]$/.test(trimmed) ? " " : ". ";
        lines[i] = `${lines[i]}${separator}${naturalSentence}`;
        return lines.join("\n");
      }
    }
  }

  return `${lines.join("\n").trimEnd()}\n\n${naturalSentence}`;
}

/**
 * Deterministically strips leftover Markdown syntax (`##`, `###`, `**bold**`, `__bold__`)
 * so HTML-only output never contains raw Markdown headings or bold markers.
 */
export function normalizeHtmlOutput(content: string): string {
  if (!content) return content;

  const cleanedLines = content.split(/\r?\n/).map((line) => {
    const trimmed = line.trim();
    // Convert Markdown headings to <h2> / <h3>
    const h3Match = trimmed.match(/^#{3,6}\s+(.+)$/);
    if (h3Match) {
      const inner = h3Match[1].replace(/\*\*|__/g, "").replace(/#+\s*$/, "").trim();
      return `<h3>${inner}</h3>`;
    }
    const h12Match = trimmed.match(/^#{1,2}\s+(.+)$/);
    if (h12Match) {
      const inner = h12Match[1].replace(/\*\*|__/g, "").replace(/#+\s*$/, "").trim();
      return `<h2>${inner}</h2>`;
    }

    // Strip **bold** and __bold__ markers (preserving text)
    let out = line.replace(/\*\*([^*\n]+)\*\*/g, "$1").replace(/__([^_\n]+)__/g, "$1");
    // Strip stray ** inside <h2>/<h3> tags
    out = out.replace(/<(h[1-6])([^>]*)>\s*\*\*([^*<]+)\*\*\s*<\/\1>/gi, "<$1$2>$3</$1>");
    return out;
  });

  return cleanedLines.join("\n");
}
