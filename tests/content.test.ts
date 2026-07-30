import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "../src/generated/manifest.json";

describe("generated knowledge base", () => {
  it("publishes a substantial canonical collection", () => {
    expect(manifest.documents.length).toBeGreaterThan(150);
    expect(manifest.diagnostics.sourceCount).toBeGreaterThan(1000);
  });

  it("uses unique, stable document paths", () => {
    const slugs = manifest.documents.map((document) => document.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs.every((slug) => /^[a-z0-9/-]+$/.test(slug))).toBe(true);
  });

  it("does not directly expose operational or archive source trees", () => {
    for (const document of manifest.documents) {
      expect(document.sourcePath).not.toMatch(
        /^(00 Inbox|01 Daily Notes|05 Archive|06 AI Generated|07 Reflections|08 Datasets|90 Operations|99 System)\//,
      );
      expect(document.sourcePath).not.toMatch(/AGENTS\.md$/);
    }
  });

  it("contains no obvious credential material", () => {
    const serialized = JSON.stringify(manifest.documents);
    expect(serialized).not.toMatch(/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/i);
    expect(serialized).not.toMatch(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/);
  });

  it("resolves every generated document relationship", () => {
    const slugs = new Set(manifest.documents.map((document) => document.slug));
    for (const document of manifest.documents) {
      for (const target of [...document.links, ...document.backlinks]) {
        expect(slugs.has(target), `${document.slug} links to missing ${target}`).toBe(true);
      }
    }
  });

  it("ships a crawlable search index and social preview", () => {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
    expect(packageJson.scripts.build).toContain("astro build");
    expect(readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8")).toContain("Sitemap:");
    expect(readFileSync(new URL("../public/og.png", import.meta.url)).byteLength).toBeGreaterThan(10_000);
  });
});
