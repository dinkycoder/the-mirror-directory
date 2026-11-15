import { NextResponse } from "next/server";
import {
  createSessionToken,
  getAccessKey,
  passwordMatches,
  safeNextPath,
  SESSION_COOKIE,
  SESSION_MAX_AGE_MS,
} from "@/lib/auth";

/** Relative redirect, so it stays on whatever host the browser used. */
const seeOther = (location: string) => new NextResponse(null, { status: 303, headers: { Location: location } });

async function signIn(given: string, next: string | null) {
  const expected = getAccessKey(process.env);
  const secret = process.env.SESSION_SECRET ?? "";
  if (!expected || !secret) return seeOther("/login?error=setup");
  if (!passwordMatches(given, expected)) {
    await new Promise((r) => setTimeout(r, 750)); // slow down guessing
    return seeOther("/login?error=link");
  }
  const response = seeOther(safeNextPath(next));
  response.cookies.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return response;
}

/** The private link: /?key=... is sent here by proxy.ts, signs the device in, then drops the key from the address bar. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  return signIn(url.searchParams.get("key") ?? "", url.searchParams.get("next"));
}

/** Fallback: typing the access code on the sign-in page. */
export async function POST(request: Request) {
  const form = await request.formData();
  return signIn(String(form.get("key") ?? form.get("password") ?? ""), null);
}
