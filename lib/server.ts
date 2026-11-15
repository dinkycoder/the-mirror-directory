import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import type { ReviewContext } from "./claude";
import { parseUpload } from "./parse";
import { loadResearch } from "./research";
import { loadRubric } from "./rubric";

/** Checked in each API route as well as in proxy.ts, so routes stay safe even if the proxy is bypassed. */
export async function isSignedIn(): Promise<boolean> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, process.env.SESSION_SECRET ?? "");
}

/** Reads the draft, genre and research fields shared by "Get notes" and "Ask the Screenwriter". */
export async function readDraftForm(form: FormData): Promise<ReviewContext> {
  const file = form.get("script");
  if (!(file instanceof File) || file.size === 0) throw new Error("Please choose a script file.");
  const researchId = String(form.get("research") ?? "");
  return {
    script: parseUpload(file.name, new Uint8Array(await file.arrayBuffer())),
    rubric: await loadRubric(String(form.get("genre") ?? "")),
    research: researchId ? await loadResearch(researchId) : null,
  };
}
