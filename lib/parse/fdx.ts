import { XMLParser } from "fast-xml-parser";
import { isSceneHeading, paginate } from "./paginate";
import type { ParsedScript } from "./types";

type Node = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  isArray: (name) => name === "Paragraph" || name === "Text",
  trimValues: false,
  processEntities: true,
});

const UPPERCASE_TYPES = new Set(["Scene Heading", "Character", "Transition", "Shot"]);

function textOf(paragraph: Node): string {
  const parts = (paragraph.Text as unknown[] | undefined) ?? [];
  return parts
    .map((t) => (typeof t === "string" || typeof t === "number" ? String(t) : String((t as Node)["#text"] ?? "")))
    .join("")
    .trim();
}

function paragraphsOf(content: unknown): Node[] {
  if (!content || typeof content !== "object") return [];
  return ((content as Node).Paragraph as Node[] | undefined) ?? [];
}

/** Parse a Final Draft .fdx file (XML) into screenplay text. */
export function parseFdx(xml: string): ParsedScript {
  let doc: Node;
  try {
    doc = parser.parse(xml) as Node;
  } catch {
    throw new Error("This file is not a valid Final Draft (.fdx) document.");
  }
  const root = doc.FinalDraft as Node | undefined;
  if (!root || typeof root !== "object") throw new Error("This file is not a valid Final Draft (.fdx) document.");

  const lines: string[] = [];
  for (const p of paragraphsOf(root.Content)) {
    const type = String(p["@Type"] ?? "Action");
    let text = textOf(p);
    if (!text) continue;
    if (UPPERCASE_TYPES.has(type)) text = text.toUpperCase();
    if (type === "Parenthetical" && !text.startsWith("(")) text = `(${text})`;
    // Dialogue and parentheticals sit directly under their character; everything else gets a blank line before it.
    if (type !== "Dialogue" && type !== "Parenthetical" && lines.length) lines.push("");
    lines.push(text);
  }

  const titlePage = paragraphsOf((root.TitlePage as Node | undefined)?.Content);
  const firstTitleLine = titlePage.map(textOf).find((t) => t.length > 0) ?? null;

  return {
    format: "fdx",
    title: firstTitleLine,
    pages: paginate(lines),
    sceneCount: lines.filter(isSceneHeading).length,
  };
}
