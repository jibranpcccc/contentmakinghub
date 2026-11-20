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

  // No valid body link found — link the first plain-text exact keyword occurrence in a body paragraph
  const escapedKw = escapeRegExp(cleanKw);
  const isAsciiWord = /^[a-z0-9]/i.test(cleanKw) && /[a-z0-9]$/i.test(cleanKw);
  const kwPattern = isAsciiWord
    ? new RegExp(`(?<![\\w\\[/="'])${escapedKw}(?![\\w\\]"'])`, "i")
    : new RegExp(escapedKw, "i");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isHeadingLine(line, format)) continue;
    if (line.includes(cleanUrl)) continue;

    if (kwPattern.test(line)) {
      lines[i] = line.replace(kwPattern, exactLink);
      return lines.join("\n");
    }
  }

  // Fallback: insert a natural contextual reference at the end of the first substantial paragraph
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (isHeadingLine(trimmed, format)) continue;
    if (trimmed.length >= 60) {
      const separator = /[.!?]$/.test(trimmed) ? " " : ". ";
      lines[i] = `${lines[i]}${separator}Learn more about ${exactLink} for deeper insights.`;
      return lines.join("\n");
    }
  }

  return `${lines.join("\n").trimEnd()}\n\nLearn more about ${exactLink}.`;
}
