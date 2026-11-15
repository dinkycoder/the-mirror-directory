"use client";

import type { AdvisorNote } from "@/lib/advisors";
import { advisorName, formatNoteLocation, reportToMarkdown } from "@/lib/export";
import type { Report } from "@/lib/report";

function Note({ note }: { note: AdvisorNote }) {
  const loc = formatNoteLocation(note);
  return (
    <p className="note">
      <span className={`sev sev-${note.severity}`}>{note.severity}</span>
      {note.note} {loc && <span className="loc">({loc})</span>}
    </p>
  );
}

function download(report: Report, meta: { title: string | null; filename: string }) {
  const blob = new Blob([reportToMarkdown(report, meta)], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(meta.title ?? meta.filename).replace(/[^\w\- ]+/g, "").trim() || "notes"} - notes.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportView({ report, meta }: { report: Report; meta: { filename: string; title: string | null; pages: number | null } }) {
  return (
    <section aria-label="Notes">
      <div className="card">
        <div className="topbar">
          <div>
            <h2 style={{ marginTop: 0 }}>Notes on {meta.title ?? meta.filename}</h2>
            {meta.pages != null && <p className="muted">About {meta.pages} {meta.pages === 1 ? "page" : "pages"} (estimated from the file).</p>}
          </div>
          {report.weightedScore != null && (
            <div><span className="score">{report.weightedScore}</span><span className="muted"> / 100</span></div>
          )}
        </div>
        <button className="secondary" onClick={() => download(report, meta)}>Download notes</button>
      </div>

      {report.failures.map((f) => (
        <p key={f.advisorId} className="error">{advisorName(f.advisorId)} could not finish: {f.error}</p>
      ))}

      <h2>What's working</h2>
      <div className="card">
        {report.strengths.length === 0 && <p className="muted">No strengths were listed.</p>}
        <ul>
          {report.strengths.map((s, i) => (
            <li key={i}><span className="strength">{s.text}</span> <span className="loc">— {advisorName(s.advisorId)}</span></li>
          ))}
        </ul>
      </div>

      <h2>Top priorities for the next draft</h2>
      <div className="card">
        {report.priorities.length === 0 && <p className="muted">No rubric area scored below 5.</p>}
        <ol className="priorities">
          {report.priorities.map((p) => (
            <li key={p.criterionId}>
              <strong>{p.name}</strong> <span className="pill">{p.score}/5</span> <span className="loc">— {advisorName(p.advisorId)}</span>
              {p.rationale && <p className="note">{p.rationale}</p>}
              {p.note && <Note note={p.note} />}
            </li>
          ))}
        </ol>
      </div>

      <h2>Scorecard</h2>
      <div className="card table-wrap">
        <table>
          <thead><tr><th>Criterion</th><th>Weight</th><th>Score</th><th>Advisor</th><th>Why</th></tr></thead>
          <tbody>
            {[...report.scorecard, ...report.bonus].map((r) => (
              <tr key={r.criterionId}>
                <td>{r.name}</td>
                <td>{r.weight ? `${r.weight}%` : "bonus"}</td>
                <td>{r.score ?? "–"}</td>
                <td>{advisorName(r.advisorId)}</td>
                <td>{r.rationale}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>From each advisor</h2>
      {report.advisors.map((a) => (
        <div className="card" key={String(a.advisorId)}>
          <h3>{advisorName(String(a.advisorId))} {a.result.verdict && <span className="pill">{a.result.verdict}</span>}</h3>
          <p>{a.result.summary}</p>
          {a.result.logline && <p><em>Logline:</em> {a.result.logline}</p>}
          {a.result.notes.map((n, i) => <Note key={i} note={n} />)}
        </div>
      ))}
    </section>
  );
}
