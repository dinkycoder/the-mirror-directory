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
| Screenwriter | — | answers the writer's questions with revision options, from its own "Ask" button |

**Get notes** runs the five critics. The report opens with what already works, then the **top three
priorities** for the next draft (biggest weighted gaps, each with the advisor's most important note),
then the full scorecard and every advisor's notes.

**Ask the Screenwriter** has its own button below the report. It reads the same draft and, once
notes exist, the notes too, so answers can build on them. It also works before any notes. A question
takes well under a minute.

"Download notes and answers" saves everything as Markdown. Nothing is stored on the server, so
download before closing the page. Choosing a different draft starts fresh.

Advisors give notes, not pages: none of them rewrites the script. The Screenwriter may sketch short,
clearly labelled examples, but the choices are the writer's.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `ANTHROPIC_API_KEY`, `APP_PASSWORD` and
   `SESSION_SECRET` (for example `openssl rand -hex 32`).
3. `npm run dev`, then open http://localhost:3000 and sign in with `APP_PASSWORD`.

To deploy, import the repository into Vercel and set the same three environment variables.
Getting notes makes five Claude calls and can take a few minutes; the routes allow up to 300 seconds.

## Signing in

The writer signs in with `APP_PASSWORD`; each device stays signed in for 30 days. To change the
password, change `APP_PASSWORD` in Vercel and redeploy. To sign out every device, also change
`SESSION_SECRET`. (If only `ACCESS_KEY` is set, from the earlier private-link version, it is used as
the password.)

Also set a monthly spend limit for the API key in the Claude Console, so cost is capped whatever happens.

## Privacy

Scripts are processed in memory for each request and never stored by this app. The Claude API does not
train on API inputs by default. There is a single password-protected sign-in.

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
- `lib/claude.ts` builds each advisor's and the Screenwriter's request. The system prompt and script
  are identical for all of them, so the first call caches them for an hour and later calls on the
  same draft, including questions, read from cache. Responses use
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
