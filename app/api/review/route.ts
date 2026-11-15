import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { criticAdvisors } from "@/lib/advisors";
import { createClaudeRunner, type ReviewContext } from "@/lib/claude";
import { buildReport } from "@/lib/report";
import { runReview } from "@/lib/review";
import { isSignedIn, readDraftForm } from "@/lib/server";

// Five advisors reading a full feature script can take a few minutes.
export const maxDuration = 300;

/** Scripts are processed in memory and never stored by this app. */
export async function POST(request: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  let ctx: ReviewContext;
  try {
    ctx = await readDraftForm(await request.formData());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not read that upload." }, { status: 400 });
  }

  try {
    const report = buildReport(ctx.rubric, await runReview(criticAdvisors(), createClaudeRunner(ctx)));
    if (report.advisors.length === 0) {
      return NextResponse.json({ error: `No advisor could finish: ${report.failures[0]?.error ?? "unknown error"}` }, { status: 502 });
    }
    const script = ctx.script;
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
