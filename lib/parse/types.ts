export interface ParsedScript {
  format: "fountain" | "fdx";
  title: string | null;
  /** Page text in reading order. Page numbers are estimates (see paginate.ts). */
  pages: string[];
  sceneCount: number;
}

export type ScriptInput =
  | { kind: "pdf"; filename: string; base64: string }
  | { kind: "text"; filename: string; parsed: ParsedScript };
