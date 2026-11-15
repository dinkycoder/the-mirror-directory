import { describe, expect, it } from "vitest";
import { listResearch, loadResearch } from "@/lib/research";
import { reportToMarkdown } from "@/lib/export";
import type { Report } from "@/lib/report";

describe("research notes", () => {
  it("lists the shipped Haitian Revolution notes", async () => {
    const notes = await listResearch();
    expect(notes.map((r) => r.id)).toContain("haitian-revolution");
    expect(notes.find((r) => r.id === "haitian-revolution")?.label).toBe("The Haitian Revolution, Toussaint Louverture and Napoleon");
  });

  it("loads notes by id and refuses path tricks", async () => {
    expect(await loadResearch("haitian-revolution")).toContain("Fort de Joux");
    await expect(loadResearch("../package")).rejects.toThrow(/unknown research/i);
  });
});

describe("reportToMarkdown", () => {
  const report: Report = {
    rubricId: "historical-fiction",
    weightedScore: 68,
    scorecard: [{ criterionId: "personal-spine", name: "Personal spine", weight: 20, advisorId: "reader", score: 3, rationale: "Want is unclear" }],
    bonus: [],
    priorities: [
      {
        criterionId: "personal-spine", name: "Personal spine", weight: 20, advisorId: "reader", score: 3, rationale: "Want is unclear",
        note: { page: 12, scene: "INT. FORT DE JOUX - NIGHT", note: "Give Toussaint a goal in the cell", severity: "high" },
      },
    ],
    strengths: [{ advisorId: "director", text: "Vivid snow imagery" }],
    advisors: [
      { advisorId: "reader", status: "ok", result: { summary: "Strong premise.", strengths: [], notes: [], scores: [], verdict: "CONSIDER", logline: "A jailed general..." } },
    ],
    failures: [{ advisorId: "agent", error: "rate limited" }],
  };

  it("opens with what works, then the top priorities", () => {
    const md = reportToMarkdown(report, { title: "The Black Consul", filename: "draft.pdf" });
    expect(md.indexOf("What's working")).toBeLessThan(md.indexOf("Top priorities"));
    expect(md).toContain("# Notes: The Black Consul");
    expect(md).toContain("p. 12");
    expect(md).toContain("Verdict: CONSIDER");
    expect(md).toContain("68 / 100");
    expect(md).toContain("Agent could not finish: rate limited");
  });

  it("includes the screenwriter's answers when there are any", () => {
    const md = reportToMarkdown(report, { title: "The Black Consul", filename: "draft.pdf" }, [
      { question: "How do I open?", answer: { answer: "Start in the cell.", options: [{ title: "Cold open", description: "Begin at Fort de Joux.", page: 1, example: null }] } },
    ]);
    expect(md).toContain("## Questions for the Screenwriter");
    expect(md).toContain("How do I open?");
    expect(md).toContain("Cold open");
  });

  it("works with answers alone, before any notes exist", () => {
    const md = reportToMarkdown(null, { title: null, filename: "draft.pdf" }, [
      { question: "Q?", answer: { answer: "A.", options: [] } },
    ]);
    expect(md).toContain("# Notes: draft.pdf");
    expect(md).toContain("Q?");
    expect(md).not.toContain("Scorecard");
  });
});
