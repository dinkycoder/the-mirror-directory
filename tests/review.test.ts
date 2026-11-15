import { describe, expect, it } from "vitest";
import { runReview, type RunAdvisor } from "@/lib/review";
import { ADVISORS, buildAdvisorInstructions, buildScreenwriterInstructions, buildSharedSystem, criticAdvisors } from "@/lib/advisors";
import { loadRubric } from "@/lib/rubric";

const empty = { summary: "", strengths: [], notes: [], scores: [], verdict: null, logline: null };

describe("criticAdvisors", () => {
  it("is the five critics; the screenwriter is asked separately", () => {
    expect(criticAdvisors().map((a) => a.id)).toEqual(["reader", "producer", "agent", "director", "historian"]);
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
    const text = buildAdvisorInstructions(historian, rubric);
    expect(text).toContain("fiction-in-the-gaps");
    expect(text).not.toContain("producibility");
  });

  it("forbids rewriting pages unless the writer asked", async () => {
    const rubric = await loadRubric("historical-fiction");
    const reader = ADVISORS.find((a) => a.id === "reader")!;
    expect(buildAdvisorInstructions(reader, rubric)).toMatch(/do not rewrite/i);
  });

  it("gives the screenwriter the question and, when there are any, the notes", async () => {
    const rubric = await loadRubric("historical-fiction");
    const withNotes = buildScreenwriterInstructions(rubric, "Fix the opening", "Reader: the spine is weak (p. 3)");
    expect(withNotes).toContain("Fix the opening");
    expect(withNotes).toContain("Reader: the spine is weak (p. 3)");
    const without = buildScreenwriterInstructions(rubric, "Fix the opening", null);
    expect(without).toContain("Fix the opening");
    expect(without).toMatch(/no notes yet/i);
  });

  it("keeps the writer's pages theirs: examples are labelled, choices are the writer's", async () => {
    const rubric = await loadRubric("historical-fiction");
    expect(buildScreenwriterInstructions(rubric, "q", null)).toMatch(/clearly labelled as examples/i);
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
    const outcomes = await runReview(criticAdvisors(), run);
    expect(events.slice(0, 2)).toEqual(["start:reader", "end:reader"]);
    expect(events.slice(2, 6).every((e) => e.startsWith("start:"))).toBe(true);
    expect(outcomes.every((o) => o.status === "ok")).toBe(true);
  });

  it("keeps going when one advisor fails", async () => {
    const run: RunAdvisor = async (advisor) => {
      if (advisor.id === "agent") throw new Error("boom");
      return empty;
    };
    const outcomes = await runReview(criticAdvisors(), run);
    expect(outcomes.find((o) => o.advisorId === "agent")).toEqual({ advisorId: "agent", status: "error", error: "boom" });
    expect(outcomes.filter((o) => o.status === "ok")).toHaveLength(4);
  });
});
