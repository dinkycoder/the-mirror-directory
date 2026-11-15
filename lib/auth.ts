import { createHash, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "mirror_session";
/** The private link remembers a device for a year. */
export const SESSION_MAX_AGE_MS = 365 * 24 * 3600 * 1000;

/** ACCESS_KEY is the code in the private link; APP_PASSWORD is still honoured for existing deployments. */
export function getAccessKey(env: Record<string, string | undefined>): string {
  return env.ACCESS_KEY || env.APP_PASSWORD || "";
}

/** Only same-site paths, so a crafted link cannot bounce the visitor to another website. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.startsWith("/login")) return "/";
  return next;
}

const encoder = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Buffer.from(sig).toString("hex");
}

/** Token format: `<issued-at ms>.<hex HMAC of issued-at>`. */
export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  const issued = String(now);
  return `${issued}.${await hmacHex(secret, issued)}`;
}

export async function verifySessionToken(token: string | undefined, secret: string, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false;
  const [issued, sig] = token.split(".");
  if (!issued || !sig || !/^\d+$/.test(issued)) return false;
  const expected = await hmacHex(secret, issued);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return false;
  const age = now - Number(issued);
  return age >= 0 && age < SESSION_MAX_AGE_MS;
}

/** Compares SHA-256 digests so the comparison time does not depend on where the strings differ. */
export function passwordMatches(given: string, expected: string): boolean {
  if (!given || !expected) return false;
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
