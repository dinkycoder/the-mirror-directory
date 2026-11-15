import type { ParsedScript } from "./types";

/**
 * A formatted screenplay page holds about 55 lines (12pt Courier, standard margins).
 * Plain-text formats carry no layout, so page numbers are estimates; PDFs keep their real pages.
 */
export const LINES_PER_PAGE = 55;

const PAGE_BREAK = /^={3,}\s*$/;
const SCENE_HEADING = /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/i;
const FORCED_HEADING = /^\.[A-Za-z0-9]/;

export function isSceneHeading(line: string): boolean {
  const t = line.trim();
  return SCENE_HEADING.test(t) || FORCED_HEADING.test(t);
}

export function paginate(lines: string[]): string[] {
  const pages: string[] = [];
  let current: string[] = [];
  const flush = () => {
    while (current.length && current[current.length - 1].trim() === "") current.pop();
    if (current.length) pages.push(current.join("\n"));
    current = [];
  };
  for (const line of lines) {
    if (PAGE_BREAK.test(line)) {
      flush();
      continue;
    }
    if (current.length === 0 && line.trim() === "") continue;
    current.push(line);
    if (current.length >= LINES_PER_PAGE) flush();
  }
  flush();
  return pages;
}

export function renderWithPageMarkers(script: ParsedScript): string {
  return script.pages.map((page, i) => `=== Page ${i + 1} ===\n${page}`).join("\n\n");
}
