import { parseFdx } from "./fdx";
import { parseFountain } from "./fountain";
import type { ScriptInput } from "./types";

export type { ParsedScript, ScriptInput } from "./types";

/** The Messages API accepts requests up to 32 MB; leave room for base64 growth and prompts. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export function parseUpload(filename: string, bytes: Uint8Array): ScriptInput {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("That file is too large (20 MB maximum).");
  const ext = filename.toLowerCase().split(".").pop() ?? "";

  if (ext === "pdf") {
    const magic = new TextDecoder().decode(bytes.slice(0, 5));
    if (magic !== "%PDF-") throw new Error("That file is named .pdf but is not a PDF.");
    return { kind: "pdf", filename, base64: Buffer.from(bytes).toString("base64") };
  }

  const text = new TextDecoder("utf-8").decode(bytes);
  if (ext === "fdx") return { kind: "text", filename, parsed: parseFdx(text) };
  if (ext === "fountain" || ext === "txt") return { kind: "text", filename, parsed: parseFountain(text) };

  throw new Error("Please upload a PDF, Fountain or Final Draft (.fdx) file.");
}
