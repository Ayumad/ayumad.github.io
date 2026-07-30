import matter from "gray-matter";
import GithubSlugger from "github-slugger";
import { Marked } from "marked";
import sanitizeHtml from "sanitize-html";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  readingTime: string;
  html: string;
  headings: { depth: number; text: string; id: string }[];
}

const rawPosts = import.meta.glob<string>("../content/blog/*.md", {
  eager: true,
  import: "default",
  query: "?raw",
});

function renderPost(source: string, filename: string): BlogPost {
  const { data, content } = matter(source);
  const required = ["slug", "title", "date", "summary", "readingTime"] as const;
  for (const field of required) {
    if (typeof data[field] !== "string" || !data[field].trim()) {
      throw new Error(`Blog post ${filename} is missing ${field}.`);
    }
  }

  const slugger = new GithubSlugger();
  const headings: BlogPost["headings"] = [];
  const marked = new Marked({ gfm: true });
  const rendered = marked.parse(content) as string;
  const withAnchors = rendered.replace(
    /<h([2-4])>([\s\S]*?)<\/h\1>/g,
    (_match, depthValue: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      const id = slugger.slug(text);
      const depth = Number(depthValue);
      headings.push({ depth, text, id });
      return `<h${depth} id="${id}">${inner}<a class="heading-anchor" href="#${id}" aria-label="Link to ${text}">#</a></h${depth}>`;
    },
  );
  const html = sanitizeHtml(withAnchors, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "details",
      "summary",
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["id", "class"],
      a: ["href", "title", "target", "rel", "class", "aria-label"],
      img: ["src", "alt", "title", "loading", "width", "height"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });

  return {
    slug: data.slug,
    title: data.title,
    date: data.date,
    summary: data.summary,
    tags: Array.isArray(data.tags)
      ? data.tags.map(String)
      : String(data.tags ?? "")
          .split("|")
          .map((tag) => tag.trim())
          .filter(Boolean),
    readingTime: data.readingTime,
    html,
    headings,
  };
}

export const blogPosts = Object.entries(rawPosts)
  .map(([filename, source]) => renderPost(source, filename))
  .sort((a, b) => b.date.localeCompare(a.date));

const slugs = new Set(blogPosts.map((post) => post.slug));
if (slugs.size !== blogPosts.length) {
  throw new Error("Blog post slugs must be unique.");
}

export function findBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
