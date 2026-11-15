import type { AdvisorNote } from "./advisors";
import type { AdvisorOutcome } from "./review";
import type { Criterion, Rubric } from "./rubric";

export interface ScoreRow {
  criterionId: string;
  name: string;
  weight: number;
  advisorId: string;
  score: number | null;
  rationale: string | null;
}

export interface Priority extends ScoreRow {
  note: AdvisorNote | null;
}

export interface Report {
  rubricId: string;
  weightedScore: number | null;
  scorecard: ScoreRow[];
  bonus: ScoreRow[];
  priorities: Priority[];
  strengths: { advisorId: string; text: string }[];
  advisors: Extract<AdvisorOutcome, { status: "ok" }>[];
  failures: { advisorId: string; error: string }[];
}

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 } as const;

function clampScore(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

function rowsFor(criteria: Criterion[], ok: Extract<AdvisorOutcome, { status: "ok" }>[]): ScoreRow[] {
  return criteria.map((c) => {
    // Only the owning advisor's score counts, so each criterion has one accountable judge.
    const owner = ok.find((o) => o.advisorId === c.owner);
    const entry = owner?.result.scores.find((s) => s.criterionId === c.id && Number.isFinite(s.score));
    return {
      criterionId: c.id,
      name: c.name,
      weight: c.weight,
      advisorId: c.owner,
      score: entry ? clampScore(entry.score) : null,
      rationale: entry?.rationale ?? null,
    };
  });
}

function mostSevereNote(notes: AdvisorNote[], used: Set<AdvisorNote>): AdvisorNote | null {
  const sorted = notes.filter((n) => !used.has(n)).sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || (a.page ?? Infinity) - (b.page ?? Infinity),
  );
  return sorted[0] ?? null;
}

export function buildReport(rubric: Rubric, outcomes: AdvisorOutcome[]): Report {
  const ok = outcomes.filter((o): o is Extract<AdvisorOutcome, { status: "ok" }> => o.status === "ok");
  const failures = outcomes.flatMap((o) => (o.status === "error" ? [{ advisorId: String(o.advisorId), error: o.error }] : []));

  const scorecard = rowsFor(rubric.criteria, ok);
  const bonus = rowsFor(rubric.bonus, ok);

  const scored = scorecard.filter((r) => r.score !== null);
  const scoredWeight = scored.reduce((s, r) => s + r.weight, 0);
  const weightedScore = scoredWeight
    ? Math.round((scored.reduce((s, r) => s + r.weight * (r.score as number), 0) / (5 * scoredWeight)) * 100)
    : null;

  const usedNotes = new Set<AdvisorNote>();
  const priorities: Priority[] = scored
    .map((row, index) => ({ row, index, gap: (5 - (row.score as number)) * row.weight }))
    .filter((x) => x.gap > 0)
    .sort((a, b) => b.gap - a.gap || b.row.weight - a.row.weight || a.index - b.index)
    .slice(0, 3)
    .map(({ row }) => {
      const owner = ok.find((o) => o.advisorId === row.advisorId);
      const note = owner ? mostSevereNote(owner.result.notes, usedNotes) : null;
      if (note) usedNotes.add(note);
      return { ...row, note };
    });

  const strengths = ok.flatMap((o) => o.result.strengths.map((text) => ({ advisorId: String(o.advisorId), text })));

  return { rubricId: rubric.id, weightedScore, scorecard, bonus, priorities, strengths, advisors: ok, failures };
}
