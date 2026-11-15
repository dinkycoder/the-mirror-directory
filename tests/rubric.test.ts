import { describe, expect, it } from "vitest";
import { listGenres, loadRubric, validateRubric, type Rubric } from "@/lib/rubric";

const base: Rubric = {
  id: "test",
  label: "Test",
  description: "d",
  criteria: [
    { id: "a", name: "A", weight: 60, owner: "reader", description: "d", weak: "w", strong: "s" },
    { id: "b", name: "B", weight: 40, owner: "producer", description: "d", weak: "w", strong: "s" },
  ],
  bonus: [],
  passFail: [],
};

describe("validateRubric", () => {
  it("accepts weights that sum to 100", () => {
    expect(validateRubric(base).id).toBe("test");
  });

  it("rejects weights that do not sum to 100", () => {
    const bad = { ...base, criteria: [{ ...base.criteria[0], weight: 50 }, base.criteria[1]] };
    expect(() => validateRubric(bad)).toThrow(/sum to 100/);
  });

  it("rejects duplicate criterion ids", () => {
    const bad = { ...base, criteria: [base.criteria[0], { ...base.criteria[1], id: "a" }] };
    expect(() => validateRubric(bad)).toThrow(/duplicate/i);
  });

  it("rejects an unknown advisor as owner", () => {
    const bad = { ...base, criteria: [base.criteria[0], { ...base.criteria[1], owner: "critic" }] };
    expect(() => validateRubric(bad)).toThrow();
  });

  it("does not let the screenwriter own scored criteria", () => {
    const bad = { ...base, criteria: [base.criteria[0], { ...base.criteria[1], owner: "screenwriter" }] };
    expect(() => validateRubric(bad)).toThrow(/screenwriter/i);
  });
});

describe("shipped rubrics", () => {
  it("lists historical fiction as a genre", async () => {
    const genres = await listGenres();
    expect(genres.map((g) => g.id)).toContain("historical-fiction");
  });

  it("loads and validates the historical fiction rubric", async () => {
    const rubric = await loadRubric("historical-fiction");
    expect(rubric.criteria).toHaveLength(10);
    expect(rubric.criteria.reduce((s, c) => s + c.weight, 0)).toBe(100);
    expect(rubric.criteria.find((c) => c.id === "fiction-in-the-gaps")?.owner).toBe("historian");
  });

  it("refuses path tricks in the genre id", async () => {
    await expect(loadRubric("../package")).rejects.toThrow(/unknown genre/i);
  });
});
