import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { selectAdvisors } from "@/lib/advisors";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { createClaudeRunner } from "@/lib/claude";
import { parseUpload } from "@/lib/parse";
import { buildReport } from "@/lib/report";
import { loadResearch } from "@/lib/research";
import { runReview } from "@/lib/review";
import { loadRubric } from "@/lib/rubric";

// Six advisors reading a full feature script can take a few minutes.
export const maxDuration = 300;

/** Scripts are processed in memory and never stored by this app. */
export async function POST(request: Request) {
  // Checked here as well as in proxy.ts, so the route is safe even if the proxy is bypassed.
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token, process.env.SESSION_SECRET ?? ""))) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }

  let input;
  try {
    const form = await request.formData();
    const file = form.get("script");
    if (!(file instanceof File) || file.size === 0) throw new Error("Please choose a script file.");
    const genre = String(form.get("genre") ?? "");
    const researchId = String(form.get("research") ?? "");
    const question = String(form.get("question") ?? "").trim() || null;

    input = {
      script: parseUpload(file.name, new Uint8Array(await file.arrayBuffer())),
      rubric: await loadRubric(genre),
      research: researchId ? await loadResearch(researchId) : null,
      writerQuestion: question,
    };
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not read that upload." }, { status: 400 });
  }

  try {
    const outcomes = await runReview(selectAdvisors(input.writerQuestion), createClaudeRunner(input));
    const report = buildReport(input.rubric, outcomes);
    if (report.advisors.length === 0) {
      return NextResponse.json({ error: `No advisor could finish: ${report.failures[0]?.error ?? "unknown error"}` }, { status: 502 });
    }
    const script = input.script;
    return NextResponse.json({
      report,
      meta: {
        filename: script.filename,
        title: script.kind === "text" ? script.parsed.title : null,
        pages: script.kind === "text" ? script.parsed.pages.length : null,
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.AnthropicError) {
      return NextResponse.json({ error: "Could not connect to Claude. Check that ANTHROPIC_API_KEY is set." }, { status: 500 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong while reviewing the script." }, { status: 500 });
  }
}
