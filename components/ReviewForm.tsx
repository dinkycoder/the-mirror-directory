"use client";

import { useRef, useState } from "react";
import type { QuestionAndAnswer } from "@/lib/export";
import type { Report } from "@/lib/report";
import AskScreenwriter from "./AskScreenwriter";
import ReportView, { DownloadButton } from "./ReportView";

interface Option { id: string; label: string }
export interface ReportMeta { filename: string; title: string | null; pages: number | null }
interface ReviewResponse { report: Report; meta: ReportMeta }

async function postForm<T>(url: string, body: FormData): Promise<T> {
  const res = await fetch(url, { method: "POST", body });
  const data = await res.json().catch(() => ({ error: "The server sent an unexpected response." }));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data as T;
}

export default function ReviewForm({ genres, research }: { genres: Option[]; research: Option[] }) {
  const draftForm = useRef<HTMLFormElement>(null);
  const [notesBusy, setNotesBusy] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [answers, setAnswers] = useState<QuestionAndAnswer[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    // Notes and answers belong to the draft they were made from, so a new draft starts fresh.
    setResult(null);
    setAnswers([]);
    setNotesError(null);
    setFileName(event.target.files?.[0]?.name ?? null);
  }

  async function getNotes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotesBusy(true);
    setNotesError(null);
    try {
      setResult(await postForm<ReviewResponse>("/api/review", new FormData(event.currentTarget)));
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : String(err));
    } finally {
      setNotesBusy(false);
    }
  }

  /** The Screenwriter reads the same draft, genre and research as the notes, plus the notes if there are any. */
  async function ask(question: string, notes: string | null): Promise<void> {
    const form = draftForm.current;
    const file = (form?.elements.namedItem("script") as HTMLInputElement | null)?.files?.[0];
    if (!form || !file) throw new Error("Choose your draft at the top of the page first.");
    const body = new FormData(form);
    body.set("question", question);
    if (notes) body.set("notes", notes);
    const qa = await postForm<QuestionAndAnswer>("/api/ask", body);
    setAnswers((prev) => [...prev, qa]);
  }

  const meta: ReportMeta = result?.meta ?? { filename: fileName ?? "draft", title: null, pages: null };

  return (
    <>
      <form ref={draftForm} className="card" onSubmit={getNotes}>
        <label htmlFor="script">
          Your draft <span className="hint">PDF, Fountain (.fountain or .txt) or Final Draft (.fdx)</span>
        </label>
        <input id="script" name="script" type="file" accept=".pdf,.fountain,.txt,.fdx" required onChange={onFileChange} />

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

        <button type="submit" disabled={notesBusy}>{notesBusy ? "The room is reading…" : "Get notes"}</button>
        {notesBusy && <p className="muted">This usually takes two to five minutes for a full script. Please keep this page open.</p>}
        {notesError && <p className="error" role="alert">{notesError}</p>}
      </form>

      {result && <ReportView report={result.report} meta={result.meta} answers={answers} />}

      <AskScreenwriter
        hasNotes={result !== null}
        notesBusy={notesBusy}
        answers={answers}
        notesMarkdown={result ? { report: result.report, meta: result.meta } : null}
        onAsk={ask}
      />

      {!result && answers.length > 0 && (
        <div className="card"><DownloadButton report={null} meta={meta} answers={answers} /></div>
      )}
    </>
  );
}
