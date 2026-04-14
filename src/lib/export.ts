import { Article } from "./types";

export async function generateZip(articles: Article[]) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  articles.forEach((article, index) => {
    const sanitizedTitle = article.title.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").toLowerCase().slice(0, 80);
    const filename = `${index + 1}_${sanitizedTitle}.md`;

    const content = `# ${article.title}\n\n${article.content}`;
    zip.file(filename, content);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, "bulk_articles.zip");
}

export function generateCSV(articles: Article[]) {
  const headers = ["Title", "Content"];
  const rows = articles.map((a) => [
    `"${a.title.replace(/"/g, '""')}"`,
    `"${a.content.replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, "bulk_articles.csv");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
