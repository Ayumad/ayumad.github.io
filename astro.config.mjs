import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://ayumad.me",
  output: "static",
  integrations: [sitemap()],
  build: { format: "directory" },
  markdown: { syntaxHighlight: "shiki" },
});
