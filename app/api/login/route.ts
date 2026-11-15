import { NextResponse } from "next/server";
import { createSessionToken, passwordMatches, SESSION_COOKIE, SESSION_MAX_AGE_MS } from "@/lib/auth";

/** Relative redirect, so it stays on whatever host the browser used. */
const seeOther = (location: string) => new NextResponse(null, { status: 303, headers: { Location: location } });

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const expected = process.env.APP_PASSWORD ?? "";
  const secret = process.env.SESSION_SECRET ?? "";

  if (!expected || !secret) {
    return seeOther("/login?error=setup");
  }
  if (!passwordMatches(password, expected)) {
    await new Promise((r) => setTimeout(r, 750)); // slow down guessing
    return seeOther("/login?error=password");
  }

  const response = seeOther("/");
  response.cookies.set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return response;
}
