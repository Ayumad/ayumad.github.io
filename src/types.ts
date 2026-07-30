export type Section =
  | "about"
  | "projects"
  | "systems"
  | "interests"
  | "library"
  | "timeline";

export interface SourceNote {
  sourcePath: string;
  title: string;
  aliases: string[];
  summary: string;
  body: string;
  type?: string;
  status?: string;
  created?: string;
  updated?: string;
  tags: string[];
  links: string[];
}

export interface PublicDocument {
  id: string;
  slug: string;
  title: string;
  summary: string;
  html: string;
  text: string;
  section: Section;
  topic: string;
  status?: string;
  created?: string;
  updated?: string;
  tags: string[];
  aliases: string[];
  sourcePath: string;
  readingMinutes: number;
  links: string[];
  backlinks: string[];
  headings: Array<{ depth: number; text: string; id: string }>;
}

export interface TopicCollection {
  title: string;
  slug: string;
  description: string;
  documentIds: string[];
}

export interface ExportDiagnostics {
  generatedAt: string;
  sourceCount: number;
  publishedCount: number;
  skippedCount: number;
  duplicateCount: number;
  brokenLinks: Array<{ source: string; target: string }>;
  skipped: Array<{ source: string; reason: string }>;
}

export interface ContentManifest {
  generatedAt: string;
  documents: PublicDocument[];
  topics: TopicCollection[];
  diagnostics: ExportDiagnostics;
}
