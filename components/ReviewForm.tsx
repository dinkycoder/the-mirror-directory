"use client";

import { useState } from "react";
import type { Report } from "@/lib/report";
import ReportView from "./ReportView";

interface Option { id: string; label: string }
interface ReviewResponse { report: Report; meta: { filename: string; title: string | null; pages: number | null } }

export default function ReviewForm({ genres, research }: { genres: Option[]; research: Option[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResponse | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/review", { method: "POST", body: new FormData(event.currentTarget) });
      const body = await res.json().catch(() => ({ error: "The server sent an unexpected response." }));
      if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status}).`);
      setResult(body as ReviewResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="card" onSubmit={onSubmit}>
        <label htmlFor="script">
          Your draft <span className="hint">PDF, Fountain (.fountain or .txt) or Final Draft (.fdx)</span>
        </label>
        <input id="script" name="script" type="file" accept=".pdf,.fountain,.txt,.fdx" required />

        <label htmlFor="genre">Genre</label>
        <select id="genre" name="genre" defaultValue={genres[0]?.id}>
          {genres.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>

        <label htmlFor="research">
          Research notes <span className="hint">used by the Historian to check facts</span>
        </label>
        <select id="research" name="research" defaultValue={research[0]?.id ?? ""}>
          <option value="">None</option>
          {research.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>

        <label htmlFor="question">
          Ask the Screenwriter <span className="hint">optional, e.g. “How can I make the opening scene stronger?”</span>
        </label>
        <textarea id="question" name="question" maxLength={2000} />

        <button type="submit" disabled={busy}>{busy ? "The room is reading…" : "Get notes"}</button>
        {busy && <p className="muted">This usually takes two to five minutes for a full script. Please keep this page open.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </form>
      {result && <ReportView report={result.report} meta={result.meta} />}
    </>
  );
}
