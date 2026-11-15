import { describe, expect, it } from "vitest";
import { parseFountain } from "@/lib/parse/fountain";
import { parseFdx } from "@/lib/parse/fdx";
import { parseUpload, MAX_UPLOAD_BYTES } from "@/lib/parse";
import { paginate, renderWithPageMarkers, LINES_PER_PAGE } from "@/lib/parse/paginate";

const enc = (s: string) => new TextEncoder().encode(s);

describe("paginate", () => {
  it("splits lines into fixed-size pages", () => {
    const lines = Array.from({ length: LINES_PER_PAGE * 2 + 3 }, (_, i) => `line ${i}`);
    const pages = paginate(lines);
    expect(pages).toHaveLength(3);
    expect(pages[2].split("\n")).toHaveLength(3);
  });

  it("honours explicit page breaks", () => {
    expect(paginate(["a", "===", "b"])).toEqual(["a", "b"]);
  });

  it("renders page markers the advisors can cite", () => {
    const out = renderWithPageMarkers({ format: "fountain", title: "T", pages: ["one", "two"], sceneCount: 1 });
    expect(out).toContain("=== Page 1 ===\none");
    expect(out).toContain("=== Page 2 ===\ntwo");
  });
});

describe("parseFountain", () => {
  const sample = [
    "Title: The Black Consul",
    "Author: A. Writer",
    "",
    "EXT. FORT DE JOUX - NIGHT",
    "",
    "Snow against stone.",
    "",
    "TOUSSAINT",
    "They have cut down only the trunk.",
    "",
    "INT. TUILERIES - DAY",
    "",
    ".A FORCED HEADING",
    "",
    "Napoleon reads a letter.",
  ].join("\n");

  it("reads the title page and counts scene headings", () => {
    const parsed = parseFountain(sample);
    expect(parsed.title).toBe("The Black Consul");
    expect(parsed.sceneCount).toBe(3);
    expect(parsed.format).toBe("fountain");
  });

  it("keeps the title page out of the script body", () => {
    const parsed = parseFountain(sample);
    expect(parsed.pages[0].startsWith("EXT. FORT DE JOUX")).toBe(true);
  });

  it("works without a title page", () => {
    const parsed = parseFountain("INT. ROOM - DAY\n\nAction.");
    expect(parsed.title).toBeNull();
    expect(parsed.sceneCount).toBe(1);
  });

  it("rejects an empty script", () => {
    expect(() => parseFountain("   \n  ")).toThrow(/empty/i);
  });
});

describe("parseFdx", () => {
  const fdx = `<?xml version="1.0" encoding="UTF-8"?>
<FinalDraft DocumentType="Script" Version="5">
  <Content>
    <Paragraph Type="Scene Heading"><Text>EXT. CAP-FRANÇAIS - DAWN</Text></Paragraph>
    <Paragraph Type="Action"><Text>Ships on the horizon. </Text><Text Style="Bold">Dozens.</Text></Paragraph>
    <Paragraph Type="Character"><Text>Toussaint</Text></Paragraph>
    <Paragraph Type="Dialogue"><Text>France has come for us.</Text></Paragraph>
    <Paragraph Type="Scene Heading"><Text>INT. FORT DE JOUX - NIGHT</Text></Paragraph>
  </Content>
  <TitlePage><Content><Paragraph><Text>The Black Consul</Text></Paragraph></Content></TitlePage>
</FinalDraft>`;

  it("converts paragraphs to screenplay text", () => {
    const parsed = parseFdx(fdx);
    const text = parsed.pages.join("\n");
    expect(text).toContain("EXT. CAP-FRANÇAIS - DAWN");
    expect(text).toContain("Ships on the horizon. Dozens.");
    expect(text).toContain("TOUSSAINT");
    expect(text).toContain("France has come for us.");
    expect(parsed.sceneCount).toBe(2);
    expect(parsed.format).toBe("fdx");
  });

  it("reads the first title-page line as the title", () => {
    expect(parseFdx(fdx).title).toBe("The Black Consul");
  });

  it("rejects files that are not Final Draft documents", () => {
    expect(() => parseFdx("<html></html>")).toThrow(/Final Draft/);
  });
});

describe("parseUpload", () => {
  it("passes PDFs through as base64 documents", () => {
    const result = parseUpload("draft.pdf", enc("%PDF-1.7 fake"));
    expect(result.kind).toBe("pdf");
    if (result.kind === "pdf") expect(Buffer.from(result.base64, "base64").toString()).toBe("%PDF-1.7 fake");
  });

  it("rejects a .pdf that is not really a PDF", () => {
    expect(() => parseUpload("draft.pdf", enc("hello"))).toThrow(/PDF/);
  });

  it("parses fountain and fdx by extension", () => {
    expect(parseUpload("a.fountain", enc("INT. A - DAY\n\nx")).kind).toBe("text");
    expect(parseUpload("a.txt", enc("INT. A - DAY\n\nx")).kind).toBe("text");
    expect(
      parseUpload("a.fdx", enc('<FinalDraft><Content><Paragraph Type="Action"><Text>x</Text></Paragraph></Content></FinalDraft>')).kind,
    ).toBe("text");
  });

  it("rejects unsupported and oversized files", () => {
    expect(() => parseUpload("a.docx", enc("x"))).toThrow(/PDF, Fountain or Final Draft/);
    expect(() => parseUpload("a.pdf", new Uint8Array(MAX_UPLOAD_BYTES + 1))).toThrow(/too large/i);
  });
});
