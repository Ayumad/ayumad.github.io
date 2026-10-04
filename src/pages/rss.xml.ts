import manifest from "../generated/manifest.json";
import { blogPosts } from "../lib/blog";

export async function GET() {
  const recent = [...manifest.documents]
    .filter((document) => document.updated)
    .sort((a, b) => (b.updated || "").localeCompare(a.updated || ""))
    .slice(0, 30);
  const essays = blogPosts.map((post) => ({
    title: post.title,
    link: `https://ayumad.github.io/blog/${post.slug}/`,
    date: post.date,
    description: post.summary,
  }));
  const notes = recent.map((document) => ({
    title: document.title,
    link: `https://ayumad.github.io/notes/${document.slug}/`,
    date: document.updated!,
    description: document.summary,
  }));
  const entries = [...essays, ...notes]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Ayush’s blog and knowledge</title>
<link>https://ayumad.github.io</link>
<description>Essays and recently updated public notes from Ayush Madhukar.</description>
${entries.map((entry) => `<item><title>${escapeXml(entry.title)}</title><link>${entry.link}</link><guid>${entry.link}</guid><pubDate>${new Date(entry.date).toUTCString()}</pubDate><description>${escapeXml(entry.description)}</description></item>`).join("")}
</channel></rss>`;
  return new Response(xml, { headers: { "Content-Type": "application/rss+xml; charset=utf-8" } });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character]!);
}
