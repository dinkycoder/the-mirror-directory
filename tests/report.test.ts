import { describe, expect, it } from "vitest";
import { buildReport } from "@/lib/report";
import type { Rubric } from "@/lib/rubric";
import type { AdvisorOutcome } from "@/lib/review";
import type { AdvisorNote } from "@/lib/advisors";

const rubric: Rubric = {
  id: "t",
  label: "T",
  description: "d",
  criteria: [
    { id: "spine", name: "Personal spine", weight: 50, owner: "reader", description: "", weak: "", strong: "" },
    { id: "budget", name: "Producibility", weight: 30, owner: "producer", description: "", weak: "", strong: "" },
    { id: "gaps", name: "Fiction in the gaps", weight: 20, owner: "historian", description: "", weak: "", strong: "" },
  ],
  bonus: [{ id: "mirror", name: "Mirror device", weight: 0, owner: "director", description: "", weak: "", strong: "" }],
  passFail: [],
};

const ok = (advisorId: string, scores: { criterionId: string; score: number }[], notes: AdvisorNote[] = []): AdvisorOutcome => ({
  advisorId,
  status: "ok",
  result: {
    summary: `${advisorId} summary`,
    strengths: [`${advisorId} strength`],
    notes,
    scores: scores.map((s) => ({ ...s, rationale: "because" })),
    verdict: null,
    logline: null,
  },
});

describe("buildReport", () => {
  it("weights each criterion by its owner's score", () => {
    const report = buildReport(rubric, [
      ok("reader", [{ criterionId: "spine", score: 4 }]),
      ok("producer", [{ criterionId: "budget", score: 2 }]),
      ok("historian", [{ criterionId: "gaps", score: 5 }]),
    ]);
    // (50*4 + 30*2 + 20*5) / (5 * 100) * 100 = 72
    expect(report.weightedScore).toBe(72);
    expect(report.scorecard.find((r) => r.criterionId === "budget")?.score).toBe(2);
  });

  it("ignores scores from advisors that do not own the criterion", () => {
    const report = buildReport(rubric, [
      ok("reader", [{ criterionId: "spine", score: 4 }, { criterionId: "budget", score: 5 }]),
      ok("producer", [{ criterionId: "budget", score: 1 }]),
    ]);
    expect(report.scorecard.find((r) => r.criterionId === "budget")?.score).toBe(1);
  });

  it("clamps and rounds out-of-range scores", () => {
    const report = buildReport(rubric, [ok("reader", [{ criterionId: "spine", score: 9.4 }]), ok("producer", [{ criterionId: "budget", score: 0 }])]);
    expect(report.scorecard.find((r) => r.criterionId === "spine")?.score).toBe(5);
    expect(report.scorecard.find((r) => r.criterionId === "budget")?.score).toBe(1);
  });

  it("scores only what was scored, and is null when nothing was", () => {
    expect(buildReport(rubric, []).weightedScore).toBeNull();
    const partial = buildReport(rubric, [ok("reader", [{ criterionId: "spine", score: 3 }])]);
    expect(partial.weightedScore).toBe(60);
    expect(partial.scorecard.find((r) => r.criterionId === "gaps")?.score).toBeNull();
  });

  it("keeps bonus criteria out of the weighted score", () => {
    const report = buildReport(rubric, [ok("reader", [{ criterionId: "spine", score: 5 }]), ok("director", [{ criterionId: "mirror", score: 1 }])]);
    expect(report.weightedScore).toBe(100);
    expect(report.bonus.find((r) => r.criterionId === "mirror")?.score).toBe(1);
  });

  it("picks at most three priorities, biggest weighted gap first, with the owner's most severe note", () => {
    const report = buildReport(rubric, [
      ok("reader", [{ criterionId: "spine", score: 3 }], [
        { page: 12, scene: null, note: "minor", severity: "low" },
        { page: 30, scene: "Fort de Joux", note: "Toussaint has no clear want", severity: "high" },
      ]),
      ok("producer", [{ criterionId: "budget", score: 1 }]),
      ok("historian", [{ criterionId: "gaps", score: 5 }]),
    ]);
    // gaps: budget (5-1)*30=120, spine (5-3)*50=100, gaps 0 -> excluded
    expect(report.priorities.map((p) => p.criterionId)).toEqual(["budget", "spine"]);
    expect(report.priorities[1].note?.note).toBe("Toussaint has no clear want");
  });

  it("does not attach the same note to two priorities", () => {
    const shared: Rubric = {
      ...rubric,
      criteria: [
        { ...rubric.criteria[0], weight: 60 },
        { ...rubric.criteria[2], owner: "reader", weight: 40 },
      ],
    };
    const report = buildReport(shared, [
      ok("reader", [{ criterionId: "spine", score: 2 }, { criterionId: "gaps", score: 2 }], [
        { page: 5, scene: null, note: "first", severity: "high" },
        { page: 9, scene: null, note: "second", severity: "medium" },
      ]),
    ]);
    expect(report.priorities.map((p) => p.note?.note)).toEqual(["first", "second"]);
  });

  it("records failed advisors without breaking the report", () => {
    const report = buildReport(rubric, [{ advisorId: "agent", status: "error", error: "rate limited" }]);
    expect(report.failures).toEqual([{ advisorId: "agent", error: "rate limited" }]);
  });

  it("collects strengths first so the report opens with what works", () => {
    const report = buildReport(rubric, [ok("reader", [])]);
    expect(report.strengths).toEqual([{ advisorId: "reader", text: "reader strength" }]);
  });
});
