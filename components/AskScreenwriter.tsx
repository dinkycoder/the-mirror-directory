"use client";

import { useState } from "react";
import { reportToMarkdown, type QuestionAndAnswer } from "@/lib/export";
import type { Report } from "@/lib/report";

interface Props {
  hasNotes: boolean;
  notesBusy: boolean;
  answers: QuestionAndAnswer[];
  notesMarkdown: { report: Report; meta: { title: string | null; filename: string } } | null;
  onAsk: (question: string, notes: string | null) => Promise<void>;
}

export default function AskScreenwriter({ hasNotes, notesBusy, answers, notesMarkdown, onAsk }: Props) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const notes = notesMarkdown ? reportToMarkdown(notesMarkdown.report, notesMarkdown.meta) : null;
      await onAsk(question.trim(), notes);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Ask the Screenwriter">
      <h2>Ask the Screenwriter</h2>
      <div className="card">
        <p className="muted" style={{ marginTop: 0 }}>
          {hasNotes
            ? "The Screenwriter has read your draft and the notes above. Ask how to tackle any of them."
            : "Ask about your draft at any time. After you get notes, the Screenwriter will take them into account too."}
        </p>

        {answers.map((qa, i) => (
          <div key={i} className="qa">
            <p className="question"><strong>You asked:</strong> {qa.question}</p>
            <p>{qa.answer.answer}</p>
            {qa.answer.options.length > 0 && (
              <ul>
                {qa.answer.options.map((o, j) => (
                  <li key={j}>
                    <strong>{o.title}</strong>{o.page != null && <span className="loc"> (p. {o.page})</span>}: {o.description}
                    {o.example && <p className="example"><em>Example:</em> {o.example}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <form onSubmit={submit}>
          <label htmlFor="question">
            {answers.length ? "Ask another question" : "Your question"}{" "}
            <span className="hint">e.g. “How can I make the opening scene stronger?”</span>
          </label>
          <textarea id="question" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={2000} />
          <button type="submit" disabled={busy || notesBusy || !question.trim()}>
            {busy ? "The Screenwriter is thinking…" : "Ask the Screenwriter"}
          </button>
          {notesBusy && <p className="muted">You can ask once the notes are ready.</p>}
          {busy && <p className="muted">This usually takes under a minute.</p>}
          {error && <p className="error" role="alert">{error}</p>}
        </form>
      </div>
    </section>
  );
}
