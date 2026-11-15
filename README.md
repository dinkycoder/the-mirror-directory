# The Mirror Directory

A private notes room for a first-time screenwriter. Upload a draft, pick a genre, and a room of AI
advisors reads it against that genre's rubric:

| Advisor | Scores | Gives |
|---|---|---|
| Reader | personal spine, dramatic irony, period antagonist, convergence, ending | coverage, logline, Pass / Consider / Recommend, format and length check |
| Producer | producibility | budget flags and cheaper ways to get the same effect |
| Agent | theme | marketability, hook, comparable films |
| Director | world texture, dialogue, mirror device (bonus) | what plays on screen |
| Historian | fiction in the gaps | fact versus invention, checked against the research notes |
| Screenwriter | — | revision options, **only** when the writer asks a question |

The report opens with what already works, then the **top three priorities** for the next draft
(biggest weighted gaps, each with the advisor's most important note), then the full scorecard and
every advisor's notes. "Download notes" saves it as Markdown.

Advisors give notes, not pages: none of them rewrites the script unless the writer asks the
Screenwriter a question.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `ANTHROPIC_API_KEY`, `APP_PASSWORD` and
   `SESSION_SECRET` (for example `openssl rand -hex 32`).
3. `npm run dev`, then open http://localhost:3000 and sign in with `APP_PASSWORD`.

To deploy, import the repository into Vercel and set the same three environment variables.
A review of a full script makes six Claude calls and can take a few minutes; the route allows up
to 300 seconds.

## Privacy

Scripts are processed in memory for one review and never stored by this app. The Claude API does not
train on API inputs by default. There is a single password-protected login.

## Customizing

- **Genres:** add a JSON file to `rubrics/` (copy `historical-fiction.json`). Weights of the main
  criteria must sum to 100, and every criterion names the advisor who scores it. It appears in the
  genre menu automatically.
- **Research notes:** add a Markdown file to `research/`. Its first heading becomes its label in the
  menu. Dates marked "(check)" are ones where sources disagree.
- **Depth vs. cost:** `ADVISOR_EFFORT` (`low` … `max`, default `high`).

## How it works

- `lib/parse/` turns PDF, Fountain or Final Draft files into what Claude reads. PDFs go to Claude as
  documents with their real page numbers; Fountain and FDX are converted to text with estimated pages.
- `lib/claude.ts` builds each advisor's request. The system prompt and script are identical for
  every advisor, so the first call caches them and the rest read from cache. Responses use
  structured outputs, and refused requests fall back server-side to another model.
- `lib/review.ts` runs the first advisor alone (to warm the cache), then the rest in parallel. One
  advisor failing does not sink the review.
- `lib/report.ts` scores each criterion from its owning advisor only and picks the priorities.

## Development

```bash
npm test          # unit tests
npm run typecheck
npm run build
```
