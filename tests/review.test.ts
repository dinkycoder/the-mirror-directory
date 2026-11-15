import { describe, expect, it } from "vitest";
import { runReview, type RunAdvisor } from "@/lib/review";
import { ADVISORS, buildAdvisorInstructions, buildSharedSystem, selectAdvisors } from "@/lib/advisors";
import { loadRubric } from "@/lib/rubric";

const empty = { summary: "", strengths: [], notes: [], scores: [], verdict: null, logline: null };

describe("selectAdvisors", () => {
  it("runs the five critics by default and the screenwriter only on request", () => {
    expect(selectAdvisors(null).map((a) => a.id)).toEqual(["reader", "producer", "agent", "director", "historian"]);
    expect(selectAdvisors("Help me fix the opening").map((a) => a.id)).toContain("screenwriter");
    expect(selectAdvisors("   ").map((a) => a.id)).not.toContain("screenwriter");
  });
});

describe("prompts", () => {
  it("shares one system prompt across advisors so the script can be cached once", async () => {
    const rubric = await loadRubric("historical-fiction");
    const system = buildSharedSystem(rubric, "RESEARCH NOTES");
    expect(system).toContain("RESEARCH NOTES");
    expect(system).toContain("Fiction in the gaps");
    expect(system).not.toMatch(/You are the (Reader|Producer)/);
  });

  it("tells each advisor which criteria it scores", async () => {
    const rubric = await loadRubric("historical-fiction");
    const historian = ADVISORS.find((a) => a.id === "historian")!;
    const text = buildAdvisorInstructions(historian, rubric, null);
    expect(text).toContain("fiction-in-the-gaps");
    expect(text).not.toContain("producibility");
  });

  it("forbids rewriting pages unless the writer asked", async () => {
    const rubric = await loadRubric("historical-fiction");
    const reader = ADVISORS.find((a) => a.id === "reader")!;
    expect(buildAdvisorInstructions(reader, rubric, null)).toMatch(/do not rewrite/i);
    const sw = ADVISORS.find((a) => a.id === "screenwriter")!;
    expect(buildAdvisorInstructions(sw, rubric, "Fix the opening")).toContain("Fix the opening");
  });
});

describe("runReview", () => {
  it("runs the first advisor alone to warm the cache, then the rest together", async () => {
    const events: string[] = [];
    const run: RunAdvisor = async (advisor) => {
      events.push(`start:${advisor.id}`);
      await new Promise((r) => setTimeout(r, 5));
      events.push(`end:${advisor.id}`);
      return empty;
    };
    const outcomes = await runReview(selectAdvisors(null), run);
    expect(events.slice(0, 2)).toEqual(["start:reader", "end:reader"]);
    expect(events.slice(2, 6).every((e) => e.startsWith("start:"))).toBe(true);
    expect(outcomes.every((o) => o.status === "ok")).toBe(true);
  });

  it("keeps going when one advisor fails", async () => {
    const run: RunAdvisor = async (advisor) => {
      if (advisor.id === "agent") throw new Error("boom");
      return empty;
    };
    const outcomes = await runReview(selectAdvisors(null), run);
    expect(outcomes.find((o) => o.advisorId === "agent")).toEqual({ advisorId: "agent", status: "error", error: "boom" });
    expect(outcomes.filter((o) => o.status === "ok")).toHaveLength(4);
  });
});
