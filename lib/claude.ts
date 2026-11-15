import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import {
  AdvisorResultSchema,
  buildAdvisorInstructions,
  buildScreenwriterInstructions,
  buildSharedSystem,
  ScreenwriterAnswerSchema,
  type Advisor,
  type AdvisorResult,
  type ScreenwriterAnswer,
} from "./advisors";
import type { ScriptInput } from "./parse";
import { renderWithPageMarkers } from "./parse/paginate";
import type { Rubric } from "./rubric";

export const MODEL = "claude-opus-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];

export interface ReviewContext {
  script: ScriptInput;
  rubric: Rubric;
  research: string | null;
}

function effort(): Effort {
  const value = process.env.ADVISOR_EFFORT as Effort | undefined;
  return value && EFFORTS.includes(value) ? value : "high";
}

function scriptBlock(script: ScriptInput): Anthropic.Beta.BetaRequestDocumentBlock {
  if (script.kind === "pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: script.base64 },
      title: script.filename,
      cache_control: { type: "ephemeral", ttl: "1h" },
    };
  }
  const p = script.parsed;
  return {
    type: "document",
    source: { type: "text", media_type: "text/plain", data: renderWithPageMarkers(p) },
    title: p.title ?? script.filename,
    context: `Converted from ${p.format === "fdx" ? "Final Draft" : "Fountain"}; ${p.pages.length} estimated pages, ${p.sceneCount} scenes. Page numbers are estimates.`,
    cache_control: { type: "ephemeral", ttl: "1h" },
  };
}

/**
 * Everything before the final instruction is byte-identical for every advisor and for the
 * Screenwriter, so the first request caches the system prompt and script (for an hour) and later
 * requests on the same draft read them from cache.
 */
function buildRequest(instructions: string, ctx: ReviewContext) {
  return {
    model: MODEL,
    max_tokens: 16000,
    betas: [FALLBACK_BETA],
    fallbacks: "default" as const,
    system: buildSharedSystem(ctx.rubric, ctx.research),
    messages: [
      {
        role: "user" as const,
        content: [scriptBlock(ctx.script), { type: "text" as const, text: instructions }],
      },
    ],
  };
}

export function buildAdvisorRequest(advisor: Advisor, ctx: ReviewContext) {
  return buildRequest(buildAdvisorInstructions(advisor, ctx.rubric), ctx);
}

export function buildScreenwriterRequest(question: string, notes: string | null, ctx: ReviewContext) {
  return buildRequest(buildScreenwriterInstructions(ctx.rubric, question, notes), ctx);
}

export async function askScreenwriter(
  question: string,
  notes: string | null,
  ctx: ReviewContext,
  client = new Anthropic(),
): Promise<ScreenwriterAnswer> {
  const response = await client.beta.messages.parse({
    ...buildScreenwriterRequest(question, notes, ctx),
    output_config: { effort: effort(), format: betaZodOutputFormat(ScreenwriterAnswerSchema) },
  });
  if (response.stop_reason === "refusal") throw new Error("The Screenwriter declined to answer that question.");
  if (response.stop_reason === "max_tokens") throw new Error("The Screenwriter's answer was cut off. Try a narrower question.");
  if (!response.parsed_output) throw new Error("The Screenwriter's answer came back in an unexpected format.");
  return response.parsed_output;
}

export function createClaudeRunner(ctx: ReviewContext, client = new Anthropic()) {
  return async (advisor: Advisor): Promise<AdvisorResult> => {
    const response = await client.beta.messages.parse({
      ...buildAdvisorRequest(advisor, ctx),
      output_config: { effort: effort(), format: betaZodOutputFormat(AdvisorResultSchema) },
    });
    if (response.stop_reason === "refusal") {
      throw new Error(`The ${advisor.name} declined to review this draft.`);
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error(`The ${advisor.name}'s notes were cut off. Try again, or upload fewer pages.`);
    }
    if (!response.parsed_output) throw new Error(`The ${advisor.name} returned notes in an unexpected format.`);
    return response.parsed_output;
  };
}
