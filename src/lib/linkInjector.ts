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
  if (format === "markdown" && /^#{1,6}\s/.test(trimmed)) return true;
  if (format === "html" && /^<h[1-6][\s>]/i.test(trimmed)) return true;
  if (format === "bbcode" && /^\[h[1-6]\]/i.test(trimmed)) return true;
  if (format === "wiki" && /^=+.+=+$/.test(trimmed)) return true;
  if (format === "plain" && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.length < 100) return true;
  return false;
}

/**
 * Ensures the generated article contains a 100% exact-match hyperlinked keyword
 * pointing to `url` in the selected `format`.
 * Preserves existing valid exact-match links untouched.
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

  // Already contains the exact-match link for this URL
  if (content.includes(exactLink)) {
    return content;
  }

  // Case-insensitive check if URL is already linked with exact keyword text
  const escapedUrl = escapeRegExp(cleanUrl);
  const escapedKw = escapeRegExp(cleanKw);

  if (format === "markdown") {
    const mdExact = new RegExp(`\\[${escapedKw}\\]\\(${escapedUrl}\\)`, "i");
    if (mdExact.test(content)) return content;
  } else if (format === "html") {
    const htmlExact = new RegExp(`<a\\s+[^>]*href=["']${escapedUrl}["'][^>]*>${escapedKw}</a>`, "i");
    if (htmlExact.test(content)) return content;
  } else if (format === "bbcode") {
    const bbExact = new RegExp(`\\[url=${escapedUrl}\\]${escapedKw}\\[/url\\]`, "i");
    if (bbExact.test(content)) return content;
  } else if (format === "wiki") {
    const wikiExact = new RegExp(`\\[${escapedUrl}\\s+${escapedKw}\\]`, "i");
    if (wikiExact.test(content)) return content;
  }

  // Try to replace the first plain-text occurrence of the exact keyword inside a body paragraph
  const lines = content.split("\n");
  const isAsciiWord = /^[a-z0-9]/i.test(cleanKw) && /[a-z0-9]$/i.test(cleanKw);
  const kwPattern = isAsciiWord
    ? new RegExp(`(?<![\\w\\[/="'])${escapedKw}(?![\\w\\]"'])`, "i")
    : new RegExp(escapedKw, "i");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isHeadingLine(line, format)) continue;
    // Skip lines that already contain the target URL
    if (line.includes(cleanUrl)) continue;

    if (kwPattern.test(line)) {
      lines[i] = line.replace(kwPattern, exactLink);
      return lines.join("\n");
    }
  }

  // Fallback: if the keyword never appeared verbatim in any body paragraph,
  // insert a natural contextual reference at the end of the first substantial paragraph.
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (isHeadingLine(trimmed, format)) continue;
    if (trimmed.length >= 60) {
      const separator = /[.!?]$/.test(trimmed) ? " " : ". ";
      lines[i] = `${lines[i]}${separator}Learn more about ${exactLink} for deeper insights.`;
      return lines.join("\n");
    }
  }

  return `${content.trimEnd()}\n\nLearn more about ${exactLink}.`;
}
