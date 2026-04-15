import { Article, OutputFormat } from "./types";

export async function generateZip(articles: Article[], format: OutputFormat) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  articles.forEach((article, index) => {
    const sanitizedTitle = article.title.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_").toLowerCase().slice(0, 80);
    const filename = `${index + 1}_${sanitizedTitle}.txt`;

    let formattedTitle = `# ${article.title}\n\n`;
    if (format === "plain") formattedTitle = `${article.title}\n\n`;
    if (format === "html") formattedTitle = `<h1>${article.title}</h1>\n\n`;
    if (format === "bbcode") formattedTitle = `[h1]${article.title}[/h1]\n\n`;
    if (format === "wiki") formattedTitle = `= ${article.title} =\n\n`;

    const content = `${formattedTitle}${article.content}`;
    zip.file(filename, content);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const zipName = articles.length > 0 ? `${articles[0].keyword.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_articles.zip` : "bulk_articles.zip";
  downloadBlob(blob, zipName);
}

export function generateCSV(articles: Article[], format: OutputFormat) {
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
