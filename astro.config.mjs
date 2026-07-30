import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://ayumad.github.io",
  output: "static",
  integrations: [sitemap()],
  build: { format: "directory" },
  markdown: { syntaxHighlight: "shiki" },
});
