import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken, passwordMatches } from "@/lib/auth";

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
    expect(await verifySessionToken(token, "secret", 1_000 + 31 * 24 * 3600 * 1000)).toBe(false);
    expect(await verifySessionToken("garbage", "secret", 2_000)).toBe(false);
  });

  it("compares passwords without short-circuiting on length", () => {
    expect(passwordMatches("toussaint", "toussaint")).toBe(true);
    expect(passwordMatches("toussain", "toussaint")).toBe(false);
    expect(passwordMatches("", "")).toBe(false);
  });
});
