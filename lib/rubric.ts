import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod/v4";
import { ADVISOR_IDS } from "./advisors";

const CriterionSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  weight: z.number().min(0),
  owner: z.enum(ADVISOR_IDS),
  description: z.string(),
  weak: z.string(),
  strong: z.string(),
});

const RubricSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string(),
  criteria: z.array(CriterionSchema).min(1),
  bonus: z.array(CriterionSchema),
  passFail: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })),
});

export type Criterion = z.infer<typeof CriterionSchema>;
export type Rubric = z.infer<typeof RubricSchema>;

const RUBRIC_DIR = path.join(process.cwd(), "rubrics");

export function validateRubric(input: unknown): Rubric {
  const rubric = RubricSchema.parse(input);
  const all = [...rubric.criteria, ...rubric.bonus];
  const ids = all.map((c) => c.id);
  const dupe = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dupe) throw new Error(`Rubric ${rubric.id} has a duplicate criterion id: ${dupe}`);
  if (all.some((c) => c.owner === "screenwriter")) {
    throw new Error("The screenwriter advises on request only and cannot own scored criteria.");
  }
  const total = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
  if (total !== 100) throw new Error(`Rubric ${rubric.id} weights must sum to 100 (got ${total}).`);
  return rubric;
}

export async function listGenres(): Promise<{ id: string; label: string }[]> {
  const files = (await readdir(RUBRIC_DIR)).filter((f) => f.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (f) => {
      const r = await loadRubric(f.replace(/\.json$/, ""));
      return { id: r.id, label: r.label };
    }),
  );
}

export async function loadRubric(id: string): Promise<Rubric> {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`Unknown genre: ${id}`);
  let raw: string;
  try {
    raw = await readFile(path.join(RUBRIC_DIR, `${id}.json`), "utf8");
  } catch {
    throw new Error(`Unknown genre: ${id}`);
  }
  return validateRubric(JSON.parse(raw));
}
