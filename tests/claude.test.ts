import { describe, expect, it } from "vitest";
import { buildAdvisorRequest, buildScreenwriterRequest, MODEL } from "@/lib/claude";
import { ADVISORS } from "@/lib/advisors";
import { loadRubric } from "@/lib/rubric";
import type { ScriptInput } from "@/lib/parse";

const textScript: ScriptInput = {
  kind: "text",
  filename: "draft.fountain",
  parsed: { format: "fountain", title: "The Black Consul", pages: ["EXT. FORT DE JOUX - NIGHT"], sceneCount: 1 },
};
const pdfScript: ScriptInput = { kind: "pdf", filename: "draft.pdf", base64: "JVBERi0=" };

describe("buildAdvisorRequest", () => {
  it("gives every advisor the same system prompt and script block so the cache is shared", async () => {
    const rubric = await loadRubric("historical-fiction");
    const reader = buildAdvisorRequest(ADVISORS[0], { script: textScript, rubric, research: "notes"});
    const director = buildAdvisorRequest(ADVISORS[3], { script: textScript, rubric, research: "notes"});
    expect(reader.system).toEqual(director.system);
    const [rFirst, rSecond] = reader.messages[0].content as any[];
    const [dFirst, dSecond] = director.messages[0].content as any[];
    expect(rFirst).toEqual(dFirst);
    expect(rFirst.cache_control).toEqual({ type: "ephemeral", ttl: "1h" });
    expect(rSecond.text).not.toEqual(dSecond.text);
  });

  it("sends text scripts with page markers and PDFs as documents", async () => {
    const rubric = await loadRubric("historical-fiction");
    const fromText = buildAdvisorRequest(ADVISORS[0], { script: textScript, rubric, research: null});
    const block = (fromText.messages[0].content as any[])[0];
    expect(block.type).toBe("document");
    expect(block.source.type).toBe("text");
    expect(block.source.data).toContain("=== Page 1 ===");
    expect(block.title).toBe("The Black Consul");

    const fromPdf = buildAdvisorRequest(ADVISORS[0], { script: pdfScript, rubric, research: null});
    const pdfBlock = (fromPdf.messages[0].content as any[])[0];
    expect(pdfBlock.source).toEqual({ type: "base64", media_type: "application/pdf", data: "JVBERi0=" });
  });

  it("uses the default model with server-side refusal fallback", async () => {
    const rubric = await loadRubric("historical-fiction");
    const req = buildAdvisorRequest(ADVISORS[0], { script: textScript, rubric, research: null});
    expect(req.model).toBe(MODEL);
    expect(MODEL).toBe("claude-opus-5-5");
    expect(req.fallbacks).toBe("default");
    expect(req.betas).toContain("server-side-fallback-2026-07-01");
  });

  it("asks the screenwriter with the same cached prefix as the advisors", async () => {
    const rubric = await loadRubric("historical-fiction");
    const ctx = { script: textScript, rubric, research: "notes" };
    const advisor = buildAdvisorRequest(ADVISORS[0], ctx);
    const ask = buildScreenwriterRequest("How do I open?", "Reader notes", ctx);
    expect(ask.system).toEqual(advisor.system);
    expect((ask.messages[0].content as any[])[0]).toEqual((advisor.messages[0].content as any[])[0]);
    expect((ask.messages[0].content as any[])[1].text).toContain("How do I open?");
    expect(ask.fallbacks).toBe("default");
  });
});
