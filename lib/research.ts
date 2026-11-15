import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const RESEARCH_DIR = path.join(process.cwd(), "research");

export async function listResearch(): Promise<{ id: string; label: string }[]> {
  const files = (await readdir(RESEARCH_DIR)).filter((f) => f.endsWith(".md")).sort();
  return Promise.all(
    files.map(async (f) => {
      const id = f.replace(/\.md$/, "");
      const firstHeading = (await loadResearch(id)).match(/^#\s+(.+)$/m)?.[1];
      const label = firstHeading?.replace(/^Research notes:\s*/i, "") ?? id;
      return { id, label: label.charAt(0).toUpperCase() + label.slice(1) };
    }),
  );
}

export async function loadResearch(id: string): Promise<string> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Unknown research notes: ${id}`);
  try {
    return await readFile(path.join(RESEARCH_DIR, `${id}.md`), "utf8");
  } catch {
    throw new Error(`Unknown research notes: ${id}`);
  }
}
