import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

/** Everything except the sign-in page, sign-in API and static assets requires a session. */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Private link: /anything?key=... signs this device in via /api/login, then lands on the same page.
  const key = searchParams.get("key");
  if (key && !pathname.startsWith("/api/")) {
    const rest = new URLSearchParams(searchParams);
    rest.delete("key");
    const next = pathname + (rest.size ? `?${rest}` : "");
    const login = request.nextUrl.clone();
    login.pathname = "/api/login";
    login.search = new URLSearchParams({ key, next }).toString();
    return NextResponse.redirect(login);
  }

  if (await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, process.env.SESSION_SECRET ?? "")) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const login = request.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
