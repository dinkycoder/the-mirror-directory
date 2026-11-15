import type { Advisor, AdvisorId, AdvisorResult } from "./advisors";

export type AdvisorOutcome =
  | { advisorId: AdvisorId | string; status: "ok"; result: AdvisorResult }
  | { advisorId: AdvisorId | string; status: "error"; error: string };

export type RunAdvisor = (advisor: Advisor) => Promise<AdvisorResult>;

async function settle(advisor: Advisor, run: RunAdvisor): Promise<AdvisorOutcome> {
  try {
    return { advisorId: advisor.id, status: "ok", result: await run(advisor) };
  } catch (err) {
    return { advisorId: advisor.id, status: "error", error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * The first advisor runs alone so its request writes the shared system prompt + script to the
 * prompt cache; the others then run in parallel and read it at a fraction of the cost.
 */
export async function runReview(advisors: Advisor[], run: RunAdvisor): Promise<AdvisorOutcome[]> {
  if (advisors.length === 0) return [];
  const [first, ...rest] = advisors;
  const firstOutcome = await settle(first, run);
  const others = await Promise.all(rest.map((a) => settle(a, run)));
  return [firstOutcome, ...others];
}
