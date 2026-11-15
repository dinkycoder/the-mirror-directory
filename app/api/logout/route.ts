import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  // Relative redirect, so it stays on whatever host the browser used.
  const response = new NextResponse(null, { status: 303, headers: { Location: "/login" } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
