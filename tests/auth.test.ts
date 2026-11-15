import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken, passwordMatches, getAccessKey, safeNextPath } from "@/lib/auth";

describe("session tokens", () => {
  it("verifies a token it signed", async () => {
    const token = await createSessionToken("secret", 1_000);
    expect(await verifySessionToken(token, "secret", 2_000)).toBe(true);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken("secret", 1_000);
    expect(await verifySessionToken(token, "other", 2_000)).toBe(false);
  });

  it("rejects tampered and expired tokens", async () => {
    const token = await createSessionToken("secret", 1_000);
    const [issued, sig] = token.split(".");
    expect(await verifySessionToken(`${Number(issued) + 1}.${sig}`, "secret", 2_000)).toBe(false);
    // The private link remembers a device for a year, so a 300-day-old session is still valid.
    expect(await verifySessionToken(token, "secret", 1_000 + 300 * 24 * 3600 * 1000)).toBe(true);
    expect(await verifySessionToken(token, "secret", 1_000 + 366 * 24 * 3600 * 1000)).toBe(false);
    expect(await verifySessionToken("garbage", "secret", 2_000)).toBe(false);
  });

  it("compares passwords without short-circuiting on length", () => {
    expect(passwordMatches("toussaint", "toussaint")).toBe(true);
    expect(passwordMatches("toussain", "toussaint")).toBe(false);
    expect(passwordMatches("", "")).toBe(false);
  });
});

describe("private link", () => {
  it("prefers ACCESS_KEY and falls back to APP_PASSWORD for existing deployments", () => {
    expect(getAccessKey({ ACCESS_KEY: "k", APP_PASSWORD: "p" })).toBe("k");
    expect(getAccessKey({ APP_PASSWORD: "p" })).toBe("p");
    expect(getAccessKey({})).toBe("");
  });

  it("only redirects to paths on this site after signing in", () => {
    expect(safeNextPath("/")).toBe("/");
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath("/notes?x=1")).toBe("/notes?x=1");
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});
