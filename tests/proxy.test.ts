import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("proxy", () => {
  it("sends signed-out visitors to the password page, even with a ?key= link", async () => {
    for (const url of ["http://localhost/", "http://localhost/?key=anything"]) {
      const res = await proxy(new NextRequest(url));
      expect(res.status).toBe(307);
      expect(new URL(res.headers.get("location")!).pathname).toBe("/login");
    }
  });

  it("answers signed-out API calls with 401", async () => {
    const res = await proxy(new NextRequest("http://localhost/api/ask", { method: "POST" }));
    expect(res.status).toBe(401);
  });
});
