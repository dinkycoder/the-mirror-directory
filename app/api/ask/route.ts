import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { askScreenwriter, type ReviewContext } from "@/lib/claude";
import { isSignedIn, readDraftForm } from "@/lib/server";

export const maxDuration = 300;

const MAX_QUESTION_CHARS = 2000;

/** One question to the Screenwriter, optionally with the notes from "Get notes" for context. */
export async function POST(request: Request) {
  if (!(await isSignedIn())) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  let ctx: ReviewContext;
  let question: string;
  let notes: string | null;
  try {
    const form = await request.formData();
    question = String(form.get("question") ?? "").trim();
    if (!question) throw new Error("Please type a question for the Screenwriter.");
    if (question.length > MAX_QUESTION_CHARS) throw new Error(`Please keep the question under ${MAX_QUESTION_CHARS} characters.`);
    notes = String(form.get("notes") ?? "").trim() || null;
    ctx = await readDraftForm(form);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not read that request." }, { status: 400 });
  }

  try {
    return NextResponse.json({ question, answer: await askScreenwriter(question, notes, ctx) });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Could not connect to Claude. Check that ANTHROPIC_API_KEY is set." }, { status: 500 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "Claude is busy or unavailable right now. Please try again in a minute." }, { status: 502 });
    }
    if (err instanceof Error && err.message.startsWith("The Screenwriter")) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error(err);
    return NextResponse.json({ error: "Something went wrong while asking the Screenwriter." }, { status: 500 });
  }
}
