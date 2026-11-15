import { z } from "zod/v4";
import type { Rubric } from "./rubric";

export const ADVISOR_IDS = ["reader", "producer", "agent", "director", "historian", "screenwriter"] as const;
export type AdvisorId = (typeof ADVISOR_IDS)[number];

export interface Advisor {
  id: AdvisorId;
  name: string;
  /** Who this advisor is and what they look for. */
  brief: string;
}

export const ADVISORS: Advisor[] = [
  {
    id: "reader",
    name: "Reader",
    brief:
      "You are a professional script reader writing coverage for a production company. Judge story, structure, character and craft. Give a logline and a verdict: PASS, CONSIDER or RECOMMEND. Also check the pass/fail items (format and length) and report any failure as a high-severity note.",
  },
  {
    id: "producer",
    name: "Producer",
    brief:
      "You are an independent film producer. Flag what drives the budget (locations, period costume, crowds, ships, battles, night shoots, VFX, cast size) and suggest cheaper ways to get the same dramatic effect.",
  },
  {
    id: "agent",
    name: "Agent",
    brief:
      "You are a literary agent deciding whether to send this script out as a writing sample. Judge the logline, the hook, comparable films and whether the theme speaks to audiences today.",
  },
  {
    id: "director",
    name: "Director",
    brief:
      "You are a film director. Judge what will play on screen: visual storytelling, scene economy, whether actors can speak the dialogue, and how period texture is shown rather than told.",
  },
  {
    id: "historian",
    name: "Historian",
    brief:
      "You are a historian advising the production. Using the research notes, separate documented fact from invention, flag contradictions of the well-documented record, and say whether each invention sits in a gap in the record. Distinguish deliberate dramatic license from accidental error. Where the research notes mark something (check), say so rather than asserting it.",
  },
  {
    id: "screenwriter",
    name: "Screenwriter",
    brief:
      "You are a senior screenwriter acting as a mentor. Answer the writer's question with concrete revision options. You may sketch short example lines or beats, clearly labelled as examples, but the choices are the writer's.",
  },
];

export const CRITIC_IDS: AdvisorId[] = ["reader", "producer", "agent", "director", "historian"];

export function selectAdvisors(writerQuestion: string | null): Advisor[] {
  const ids = writerQuestion?.trim() ? [...CRITIC_IDS, "screenwriter"] : CRITIC_IDS;
  return ids.map((id) => ADVISORS.find((a) => a.id === id)!);
}

export const AdvisorNoteSchema = z.object({
  page: z.number().nullable().describe("Page number the note refers to, or null for whole-script notes"),
  scene: z.string().nullable().describe("Short scene identifier, e.g. the scene heading, or null"),
  note: z.string().describe("The note itself: what is happening and why it matters, in plain language"),
  severity: z.enum(["high", "medium", "low"]),
});
export type AdvisorNote = z.infer<typeof AdvisorNoteSchema>;

export const AdvisorResultSchema = z.object({
  summary: z.string().describe("Two or three sentences on the draft from this advisor's point of view"),
  strengths: z.array(z.string()).describe("What already works, most important first"),
  notes: z.array(AdvisorNoteSchema).describe("Specific notes, most important first"),
  scores: z
    .array(
      z.object({
        criterionId: z.string(),
        score: z.number().describe("Whole number from 1 (weak) to 5 (strong)"),
        rationale: z.string(),
      }),
    )
    .describe("One entry per criterion you were asked to score; empty if none"),
  verdict: z.enum(["PASS", "CONSIDER", "RECOMMEND"]).nullable().describe("Reader only; null for everyone else"),
  logline: z.string().nullable().describe("Reader and Agent only; null for everyone else"),
});
export type AdvisorResult = z.infer<typeof AdvisorResultSchema>;

/**
 * Identical for every advisor in a review, so the script (sent right after it) is cached once
 * and re-read cheaply by the remaining advisors.
 */
export function buildSharedSystem(rubric: Rubric, research: string | null): string {
  const criteria = [...rubric.criteria, ...rubric.bonus]
    .map(
      (c) =>
        `- ${c.id} — ${c.name}${c.weight ? ` (weight ${c.weight}%)` : " (bonus, unweighted)"}\n  ${c.description}\n  1 = ${c.weak}\n  5 = ${c.strong}`,
    )
    .join("\n");
  const passFail = rubric.passFail.map((p) => `- ${p.id} — ${p.name}: ${p.description}`).join("\n");

  return [
    "You are part of a private development room helping a first-time screenwriter improve their draft.",
    "Several advisors each read the same script and give notes from their own professional point of view.",
    "",
    "House rules for every advisor:",
    "- Give notes, not pages. Do not rewrite the writer's scenes or dialogue unless you are the Screenwriter answering a direct question.",
    "- Be honest and specific. Anchor notes to page numbers (use the '=== Page N ===' markers or the PDF's page numbers) and scene headings.",
    "- Lead with what works. The writer is new to screenwriting: be encouraging, but never inflate a score.",
    "- Prefer a few important notes over many small ones.",
    "- Never claim the script will or will not sell; you describe craft, not outcomes.",
    "",
    `Genre: ${rubric.label}. ${rubric.description}`,
    "",
    "Rubric (score 1–5):",
    criteria,
    "",
    "Pass/fail checks:",
    passFail,
    ...(research ? ["", "Research notes on the historical period (for checking facts):", research] : []),
  ].join("\n");
}

export function buildAdvisorInstructions(advisor: Advisor, rubric: Rubric, writerQuestion: string | null): string {
  const owned = [...rubric.criteria, ...rubric.bonus].filter((c) => c.owner === advisor.id);
  const scoring = owned.length
    ? `Score exactly these criteria, and no others: ${owned.map((c) => c.id).join(", ")}.`
    : "You do not score any criteria; leave scores empty.";

  const parts = [`You are the ${advisor.name}.`, advisor.brief, scoring];
  if (advisor.id === "screenwriter") {
    parts.push(`The writer asks: """${writerQuestion ?? ""}"""`);
  } else {
    parts.push("Do not rewrite the writer's pages; describe the problem and the direction of a fix.");
  }
  parts.push("Read the script above and respond in the required format.");
  return parts.join("\n\n");
}
