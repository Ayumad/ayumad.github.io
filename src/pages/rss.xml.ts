import manifest from "../generated/manifest.json";

export async function GET() {
  const recent = [...manifest.documents]
    .filter((document) => document.updated)
    .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""))
    .slice(0, 30);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Ayush’s notes</title>
<link>https://ayumad.github.io</link>
<description>Recently updated notes from Ayush Madhukar.</description>
${recent.map((document) => `<item><title>${escapeXml(document.title)}</title><link>https://ayumad.github.io/notes/${document.slug}/</link><guid>https://ayumad.github.io/notes/${document.slug}/</guid><pubDate>${new Date(document.updated!).toUTCString()}</pubDate><description>${escapeXml(document.summary)}</description></item>`).join("")}
</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character]!);
}
