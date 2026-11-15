import { isSceneHeading, paginate } from "./paginate";
import type { ParsedScript } from "./types";

const TITLE_KEY = /^([A-Za-z][A-Za-z ]*):\s*(.*)$/;

/** Parse a Fountain (or plain-text) screenplay. https://fountain.io/syntax */
export function parseFountain(source: string): ParsedScript {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  if (lines.every((l) => l.trim() === "")) throw new Error("The script is empty.");

  let title: string | null = null;
  let start = 0;
  // A title page is a block of "Key: value" lines at the very top, ended by a blank line.
  if (TITLE_KEY.test(lines[0] ?? "") && !isSceneHeading(lines[0])) {
    let i = 0;
    while (i < lines.length && lines[i].trim() !== "") {
      const m = lines[i].match(TITLE_KEY);
      if (m && m[1].toLowerCase() === "title" && m[2].trim()) title = m[2].trim();
      i++;
    }
    start = i;
  }

  const body = lines.slice(start);
  return {
    format: "fountain",
    title,
    pages: paginate(body),
    sceneCount: body.filter(isSceneHeading).length,
  };
}
