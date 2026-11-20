import { KeywordItem } from "./types";

const URL_REGEX = /^https?:\/\/\S+$/i;

/**
 * Parses one-per-line user input into KeywordItem[] supporting:
 * - Plain keyword: `advanced breast imaging`
 * - Tab-separated (Google Sheets / Excel paste): `keyword\thttps://...` or `https://...\tkeyword`
 * - Pipe-separated: `keyword | https://...` or `https://... | keyword`
 * - Comma-separated: `keyword, https://...` or `https://..., keyword`
 * - Space-separated with URL at start or end: `https://... keyword` or `keyword https://...`
 */
export function parseKeywordLines(input: string, maxItems = 5000): KeywordItem[] {
  const lines = input.split(/\r?\n/);
  const items: KeywordItem[] = [];
  const seen = new Set<string>();

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Skip common spreadsheet header rows
    if (/^(count|links|keywords?|urls?|url's)([\t,|]|$)/i.test(line) && !/https?:\/\//i.test(line)) {
      continue;
    }

    let keyword = "";
    let url: string | undefined;

    if (line.includes("\t")) {
      const parts = line.split("\t").map((p) => p.trim()).filter(Boolean);
      const urlIdx = parts.findIndex((p) => URL_REGEX.test(p));
      if (urlIdx !== -1) {
        url = parts[urlIdx];
        const kwParts = parts.filter((_, idx) => idx !== urlIdx);
        // If user pasted Count, Links, Keyword, URL, pick the last non-URL text column
        keyword = kwParts.length > 0 ? kwParts[kwParts.length - 1] : "";
      } else {
        keyword = parts[0] || "";
      }
    } else if (line.includes("|")) {
      const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
      const urlIdx = parts.findIndex((p) => URL_REGEX.test(p));
      if (urlIdx !== -1) {
        url = parts[urlIdx];
        keyword = parts.filter((_, idx) => idx !== urlIdx).join(" | ").trim();
      } else {
        keyword = line;
      }
    } else if (/,\s*https?:\/\//i.test(line)) {
      const match = line.match(/^(.*?),\s*(https?:\/\/\S+)$/i);
      if (match) {
        keyword = match[1].trim();
        url = match[2].trim();
      }
    } else if (/^https?:\/\/\S+\s*,/i.test(line)) {
      const match = line.match(/^(https?:\/\/\S+?)\s*,\s*(.+)$/i);
      if (match) {
        url = match[1].trim();
        keyword = match[2].trim();
      }
    } else if (/^https?:\/\/\S+\s+.+$/i.test(line)) {
      const match = line.match(/^(https?:\/\/\S+)\s+(.+)$/i);
      if (match) {
        url = match[1].trim();
        keyword = match[2].trim();
      }
    } else if (/^.+\s+https?:\/\/\S+$/i.test(line)) {
      const match = line.match(/^(.+?)\s+(https?:\/\/\S+)$/i);
      if (match) {
        keyword = match[1].trim();
        url = match[2].trim();
      }
    } else {
      keyword = line;
    }

    // Strip surrounding CSV quotes if present
    keyword = keyword.replace(/^["']|["']$/g, "").trim();
    if (url) {
      url = url.replace(/^["']|["']$/g, "").trim();
    }

    if (!keyword) continue;

    const dedupeKey = `${keyword.toLowerCase()}||${url || ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    items.push(url ? { keyword, url } : { keyword });
    if (items.length >= maxItems) break;
  }

  return items;
}

export function formatKeywordItemsToText(items: KeywordItem[]): string {
  return items
    .map((item) => (item.url ? `${item.keyword}\t${item.url}` : item.keyword))
    .join("\n");
}
