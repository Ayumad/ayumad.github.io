import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import GithubSlugger from "github-slugger";
import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";
import type {
  ContentManifest,
  ExportDiagnostics,
  PublicDocument,
  Section,
  SourceNote,
  TopicCollection,
} from "../src/types";

const projectRoot = path.resolve(import.meta.dirname, "..");
const vaultRoot = path.resolve(process.env.OBSIDIAN_VAULT ?? "/Users/ayumad/Documents/Main");
const generatedDir = path.join(projectRoot, "src/generated");
const publicDir = path.join(projectRoot, "public");
const siteUrl = "https://ayumad.github.io";

const excludedRoots = new Set([
  "00 Inbox",
  "01 Daily Notes",
  "05 Archive",
  "06 AI Generated",
  "07 Reflections",
  "08 Datasets",
  "90 Operations",
  "99 System",
]);

const excludedNames = new Set(["AGENTS.md", "README.md"]);
const sensitivePatterns = [
  /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/i,
  /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|refresh[_-]?token|password)\s*[:=]\s*[^\s]{8,}/i,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
];

const topicDescriptions: Record<string, string> = {
  Technology: "Computers, software, local AI, homelab infrastructure, and the systems connecting them.",
  Audio: "Listening systems, headphones, equipment, and the concepts used to evaluate them.",
  Philosophy: "Working notes on ontology, ethics, metaphysics, and personal frameworks.",
  Photography: "Cameras, equipment, process, and visual practice.",
  Education: "Coursework, learning maps, and durable academic references.",
  "Personal Development": "Habits, reflection frameworks, and ongoing personal systems.",
  "Media and Culture": "Games, film, television, anime, books, and cultural reference lists.",
  Learning: "Books, mathematics, computing concepts, and self-directed study.",
  Lifestyle: "Practical interests, collections, products, and everyday systems.",
  Projects: "Things being built, explored, paused, and completed.",
};

async function walk(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map(async (entry) => {
        const full = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(full) : [full];
      }),
  );
  return nested.flat();
}

function cleanString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(cleanString).filter(Boolean);
  if (typeof value === "string") {
    return value
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function stripMarkdown(value: string): string {
  return value
    .replace(/---[\s\S]*?---/, "")
    .replace(/!\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^|\]#]+)(?:#[^|\]]+)?(?:\|([^\]]+))?\]\]/g, (_match, target, label) => label || target)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTarget(target: string): string {
  return target.split("#")[0].replace(/\.md$/i, "").replace(/\\/g, "/").trim();
}

function safeSlug(value: string): string {
  const slugger = new GithubSlugger();
  return slugger
    .slug(value.replace(/[’']/g, "").replace(/[&+]/g, " and "))
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isExcluded(relativePath: string, raw: string): string | undefined {
  const [root] = relativePath.split(path.sep);
  const basename = path.basename(relativePath);
  if (excludedRoots.has(root)) return `internal ${root} material`;
  if (excludedNames.has(basename) || /(?:agent instructions?|codex prompt|todo master)/i.test(basename)) {
    return "navigation or agent instruction";
  }
  if (relativePath.endsWith(".canvas") || relativePath.endsWith(".base")) return "unsupported vault view";
  if (sensitivePatterns.some((pattern) => pattern.test(raw))) return "credential-like content";
  return undefined;
}

function inferTitle(relativePath: string, body: string): string {
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || path.basename(relativePath, path.extname(relativePath));
}

function inferSection(relativePath: string, note: SourceNote): Section {
  if (relativePath === "Home.md" || note.type === "profile") return "about";
  if (relativePath.startsWith(`02 Projects${path.sep}`)) return "projects";
  if (/system|moc|inventory|loadout|comput/i.test(`${note.type} ${note.tags.join(" ")} ${relativePath}`)) {
    return "systems";
  }
  if (relativePath.startsWith(`03 Areas${path.sep}`)) return "interests";
  if (note.status === "completed" || note.status === "archived") return "timeline";
  return "library";
}

function inferTopic(relativePath: string, section: Section): string {
  const parts = relativePath.split(path.sep);
  if (parts[0] === "02 Projects") return "Projects";
  if (parts[0] === "03 Areas" || parts[0] === "04 Resources") return parts[1] || "General";
  return section === "about" ? "About" : "General";
}

function publicSlug(section: Section, topic: string, title: string): string {
  return [section, safeSlug(topic), safeSlug(title)].filter(Boolean).join("/");
}

function preprocessObsidian(markdown: string): string {
  return markdown
    .replace(/^> \[!([A-Za-z-]+)\][+-]?\s*(.*)$/gm, (_match, kind, title) => {
      return `> **${title || kind}**`;
    })
    .replace(/%%[\s\S]*?%%/g, "")
    .replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
}

function headingData(markdown: string): Array<{ depth: number; text: string; id: string }> {
  const slugger = new GithubSlugger();
  return [...markdown.matchAll(/^(#{2,4})\s+(.+)$/gm)].map((match) => ({
    depth: match[1].length,
    text: stripMarkdown(match[2]),
    id: slugger.slug(stripMarkdown(match[2])),
  }));
}

function noteKey(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\.md$/i, "").trim();
}

async function main() {
  const allFiles = await walk(vaultRoot);
  const markdownFiles = allFiles.filter((file) => file.endsWith(".md"));
  const skipped: ExportDiagnostics["skipped"] = [];
  const sourceNotes: SourceNote[] = [];

  for (const file of markdownFiles) {
    const relativePath = path.relative(vaultRoot, file);
    const raw = await fs.readFile(file, "utf8");
    const reason = isExcluded(relativePath, raw);
    if (reason) {
      skipped.push({ source: relativePath, reason });
      continue;
    }

    try {
      const parsed = matter(raw);
      const title = inferTitle(relativePath, parsed.content);
      const aliases = toStringArray(parsed.data.aliases);
      const tags = toStringArray(parsed.data.tags);
      const links = [...parsed.content.matchAll(/!?\[\[([^\]]+)\]\]/g)]
        .map((match) => normalizeTarget(match[1].split("|")[0]))
        .filter(Boolean);
      const fallbackSummary = stripMarkdown(parsed.content).replace(new RegExp(`^${title}\\s*`, "i"), "");
      sourceNotes.push({
        sourcePath: relativePath,
        title,
        aliases,
        summary: cleanString(parsed.data.summary) || fallbackSummary.slice(0, 220),
        body: parsed.content,
        type: cleanString(parsed.data.type),
        status: cleanString(parsed.data.status),
        created: cleanString(parsed.data.created),
        updated: cleanString(parsed.data.updated),
        tags,
        links,
      });
    } catch (error) {
      skipped.push({
        source: relativePath,
        reason: `parse error: ${error instanceof Error ? error.message : "unknown"}`,
      });
    }
  }

  const lookup = new Map<string, SourceNote[]>();
  for (const note of sourceNotes) {
    const keys = [
      note.title,
      path.basename(note.sourcePath, ".md"),
      note.sourcePath.replace(/\.md$/i, ""),
      ...note.aliases,
    ];
    for (const key of keys) {
      const normalized = noteKey(key);
      lookup.set(normalized, [...(lookup.get(normalized) ?? []), note]);
    }
  }

  const duplicateNotes = new Set<SourceNote>();
  for (const matches of lookup.values()) {
    if (matches.length <= 1) continue;
    const sorted = [...new Set(matches)].sort((a, b) => {
      const aArchive = a.sourcePath.includes(`${path.sep}Archive${path.sep}`) ? 1 : 0;
      const bArchive = b.sourcePath.includes(`${path.sep}Archive${path.sep}`) ? 1 : 0;
      return aArchive - bArchive || a.sourcePath.length - b.sourcePath.length;
    });
    sorted.slice(1).forEach((note) => duplicateNotes.add(note));
  }

  const canonical = sourceNotes.filter((note) => !duplicateNotes.has(note));
  const noteToSlug = new Map<SourceNote, string>();
  const slugToNote = new Map<string, SourceNote>();
  for (const note of canonical) {
    const section = inferSection(note.sourcePath, note);
    const topic = inferTopic(note.sourcePath, section);
    let slug = publicSlug(section, topic, note.title);
    if (slugToNote.has(slug)) slug = `${slug}-${createHash("sha1").update(note.sourcePath).digest("hex").slice(0, 7)}`;
    noteToSlug.set(note, slug);
    slugToNote.set(slug, note);
  }

  const brokenLinks: ExportDiagnostics["brokenLinks"] = [];
  const linkTarget = (target: string): SourceNote | undefined => {
    const candidates = lookup.get(noteKey(target)) ?? lookup.get(noteKey(path.basename(target)));
    return candidates?.find((note) => !duplicateNotes.has(note)) ?? candidates?.[0];
  };

  const incoming = new Map<SourceNote, Set<SourceNote>>();
  const documents: PublicDocument[] = [];
  for (const note of canonical) {
    const section = inferSection(note.sourcePath, note);
    const topic = inferTopic(note.sourcePath, section);
    const slug = noteToSlug.get(note)!;
    let markdown = preprocessObsidian(note.body);

    markdown = markdown.replace(/(!?)\[\[([^\]]+)\]\]/g, (_match, embed, inner) => {
      const [targetWithHeading, label] = inner.split("|");
      const [target, heading] = targetWithHeading.split("#");
      const resolved = linkTarget(normalizeTarget(target));
      if (!resolved || !noteToSlug.has(resolved)) {
        brokenLinks.push({ source: note.sourcePath, target: targetWithHeading });
        return label || path.basename(target) || targetWithHeading;
      }
      if (!incoming.has(resolved)) incoming.set(resolved, new Set());
      incoming.get(resolved)!.add(note);
      const anchor = heading ? `#${safeSlug(heading)}` : "";
      const href = `/notes/${noteToSlug.get(resolved)}/${anchor}`;
      if (embed) return `[Embedded note: ${label || resolved.title}](${href})`;
      return `[${label || resolved.title}](${href})`;
    });

    const slugger = new GithubSlugger();
    const marked = new Marked({ gfm: true });
    const renderedHtml = await marked.parse(markdown);
    const unsafeHtml = renderedHtml.replace(/<h([2-4])>([\s\S]*?)<\/h\1>/g, (_match, depth, content) => {
      const text = stripMarkdown(content.replace(/<[^>]+>/g, ""));
      const id = slugger.slug(text);
      return `<h${depth} id="${id}">${content}<a class="heading-anchor" href="#${id}" aria-label="Link to ${text}">#</a></h${depth}>`;
    });
    const html = sanitizeHtml(unsafeHtml, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "details", "summary"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        "*": ["id", "class"],
        a: ["href", "title", "target", "rel", "class"],
        img: ["src", "alt", "title", "loading", "width", "height"],
      },
      allowedSchemes: ["http", "https", "mailto"],
    });
    const text = stripMarkdown(markdown);
    documents.push({
      id: createHash("sha1").update(note.sourcePath).digest("hex").slice(0, 12),
      slug,
      title: note.title,
      summary: note.summary || text.slice(0, 220),
      html,
      text,
      section,
      topic,
      status: note.status,
      created: note.created,
      updated: note.updated,
      tags: note.tags,
      aliases: note.aliases,
      sourcePath: note.sourcePath,
      readingMinutes: Math.max(1, Math.ceil(text.split(/\s+/).length / 220)),
      links: note.links
        .map((target) => linkTarget(target))
        .filter((target): target is SourceNote => Boolean(target && noteToSlug.has(target)))
        .map((target) => noteToSlug.get(target)!),
      backlinks: [],
      headings: headingData(markdown),
    });
  }

  const bySource = new Map(documents.map((document) => [document.sourcePath, document]));
  for (const [target, sources] of incoming) {
    const document = bySource.get(target.sourcePath);
    if (document) {
      document.backlinks = [...sources]
        .map((source) => noteToSlug.get(source))
        .filter((slug): slug is string => Boolean(slug));
    }
  }

  documents.sort((a, b) => a.title.localeCompare(b.title));
  const topicMap = new Map<string, PublicDocument[]>();
  for (const document of documents) {
    topicMap.set(document.topic, [...(topicMap.get(document.topic) ?? []), document]);
  }
  const topics: TopicCollection[] = [...topicMap.entries()]
    .map(([title, topicDocuments]) => ({
      title,
      slug: safeSlug(title),
      description: topicDescriptions[title] ?? `Notes and references related to ${title.toLowerCase()}.`,
      documentIds: topicDocuments.map((document) => document.id),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const sourceStats = await Promise.all(markdownFiles.map((file) => fs.stat(file)));
  const generatedAt = new Date(Math.max(...sourceStats.map((stat) => stat.mtimeMs))).toISOString();
  const diagnostics: ExportDiagnostics = {
    generatedAt,
    sourceCount: markdownFiles.length,
    publishedCount: documents.length,
    skippedCount: skipped.length,
    duplicateCount: duplicateNotes.size,
    brokenLinks: brokenLinks.filter(
      (item, index, items) =>
        items.findIndex((candidate) => candidate.source === item.source && candidate.target === item.target) === index,
    ),
    skipped,
  };
  const manifest: ContentManifest = { generatedAt, documents, topics, diagnostics };

  await fs.mkdir(generatedDir, { recursive: true });
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(path.join(generatedDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(
    path.join(publicDir, "search.json"),
    `${JSON.stringify(
      documents.map(({ title, summary, slug, section, topic, tags, updated, text }) => ({
        title,
        summary,
        slug,
        section,
        topic,
        tags,
        updated,
        text: text.slice(0, 4000),
      })),
    )}\n`,
  );
  await fs.writeFile(path.join(publicDir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${siteUrl}/sitemap-index.xml\n`);
  await fs.writeFile(path.join(publicDir, ".nojekyll"), "");
  await fs.writeFile(path.join(projectRoot, "export-report.json"), `${JSON.stringify(diagnostics, null, 2)}\n`);
  console.log(
    `Published ${documents.length} canonical documents from ${markdownFiles.length} vault notes; ` +
      `skipped ${skipped.length}, consolidated ${duplicateNotes.size}, found ${diagnostics.brokenLinks.length} unresolved links.`,
  );
}

await main();
