import type { AdvisorNote, ScreenwriterAnswer } from "./advisors";
import type { Report } from "./report";

const NAMES: Record<string, string> = {
  reader: "Reader", producer: "Producer", agent: "Agent", director: "Director", historian: "Historian", screenwriter: "Screenwriter",
};
export const advisorName = (id: string) => NAMES[id] ?? id;

export function formatNoteLocation(note: AdvisorNote): string {
  return [note.page != null ? `p. ${note.page}` : null, note.scene].filter(Boolean).join(", ");
}

export interface QuestionAndAnswer {
  question: string;
  answer: ScreenwriterAnswer;
}

/** A plain Markdown copy of the notes and Screenwriter answers the writer can keep, print or share. */
export function reportToMarkdown(
  report: Report | null,
  meta: { title: string | null; filename: string },
  answers: QuestionAndAnswer[] = [],
): string {
  const out: string[] = [`# Notes: ${meta.title ?? meta.filename}`, ""];
  if (report) out.push(...reportSections(report));
  if (answers.length) {
    out.push("", "## Questions for the Screenwriter");
    for (const qa of answers) {
      out.push("", `### ${qa.question}`, "", qa.answer.answer);
      for (const o of qa.answer.options) {
        out.push("", `- **${o.title}**${o.page != null ? ` (p. ${o.page})` : ""}: ${o.description}`);
        if (o.example) out.push(`  - _Example:_ ${o.example}`);
      }
    }
  }
  return out.join("\n").trim() + "\n";
}

function reportSections(report: Report): string[] {
  const out: string[] = [];
  if (report.weightedScore != null) out.push(`Overall rubric score: **${report.weightedScore} / 100**`, "");

  out.push("## What's working", "");
  for (const s of report.strengths) out.push(`- ${s.text} _(${advisorName(s.advisorId)})_`);
  out.push("", "## Top priorities for the next draft", "");
  report.priorities.forEach((p, i) => {
    out.push(`${i + 1}. **${p.name}** — ${p.score}/5. ${p.rationale ?? ""}`);
    if (p.note) out.push(`   - ${p.note.note}${formatNoteLocation(p.note) ? ` (${formatNoteLocation(p.note)})` : ""}`);
  });

  out.push("", "## Scorecard", "", "| Criterion | Weight | Score | Advisor | Why |", "|---|---|---|---|---|");
  for (const r of [...report.scorecard, ...report.bonus]) {
    out.push(`| ${r.name} | ${r.weight ? `${r.weight}%` : "bonus"} | ${r.score ?? "–"} | ${advisorName(r.advisorId)} | ${(r.rationale ?? "").replace(/\|/g, "/")} |`);
  }

  for (const a of report.advisors) {
    const r = a.result;
    out.push("", `## ${advisorName(String(a.advisorId))}`, "", r.summary);
    if (r.verdict) out.push("", `Verdict: ${r.verdict}`);
    if (r.logline) out.push("", `Logline: ${r.logline}`);
    if (r.notes.length) {
      out.push("");
      for (const n of r.notes) out.push(`- [${n.severity}] ${n.note}${formatNoteLocation(n) ? ` (${formatNoteLocation(n)})` : ""}`);
    }
  }

  for (const f of report.failures) out.push("", `> ${advisorName(f.advisorId)} could not finish: ${f.error}`);
  return out;
}
