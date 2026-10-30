# Nara Agent

An Arabic-first AI agent that turns a student's answers and photos of their certificates into a
university application pack. A school counsellor then checks the pack field by field. It runs on
Meta's models and was made for the Meta Global AI Developer Hackathon 2026 (startup track) by Nara
Abroad.

- **Live product:** https://nara-application-agent.vercel.app (class mode: `/class`)
- **Code:** https://github.com/KhalidBakroun/nara-application-agent

> **Sample data for the demo.** The universities, programmes and admission rules in this app are
> fictional. The sample certificate images are synthetic and carry the watermark "SAMPLE: DEMO DATA".
> No real student data is used anywhere.

## The problem

Arab students and their school counsellors lose days on study-abroad applications. They copy grades
from photos of certificates, work out whether a Tawjihi score is enough, pick courses, fill in forms
and chase missing documents. Many families pay an agent USD 300–500 just for advice.

Nara works with schools, and a person checks every application. Nara Agent does the counsellor's
paperwork, and the counsellor approves every field.

## What it does

1. **Interview in Arabic.** The student answers by voice or by typing. The agent builds a profile:
   grades, stream, goals, budget, preferred countries and English level.
2. **Photos of documents.** The student photographs their Tawjihi certificate and English test report.
   The app finds the document in the photo, crops it, and reads every field together with where it
   sits on the page.
3. **The agent works on its own.** A tool-calling loop of at most 12 steps:
   - converts the Tawjihi grade;
   - searches the sample programmes;
   - checks the entry requirements;
   - fills the application form for the best match;
   - lists what is missing.

   Every step shows in a live trace.
4. **Counsellor review.** Every field shows:
   - its value;
   - its source: a zoomed crop of the document with the value highlighted, or a quote from the
     interview;
   - a confidence level.

   A field with no source is marked "needs counsellor". The counsellor approves or edits each field,
   then the whole pack.
5. **Class mode.** A counsellor runs the agent for a whole class: up to 30 students, 3 at a time. The
   result is one table showing each student's best programme, entry route and number of missing
   items, with a link to each pack.
6. **Arabic first, with an English toggle.**

Pages: `/` is the student flow, `/review` the counsellor review, and `/class` class mode.

## What was built before kickoff, and what was built during the hackathon

The participant guide lets startups build on existing code, as long as they clearly identify what was
newly built during the hackathon. The demo must highlight only that new work. This section shows it
commit by commit.

- **Kickoff:** Monday 26 Oct 2026, 12:00 ET (16:00 UTC).
- **We started too early.** We began writing about one to two hours before kickoff, before we had
  checked the official start time.
  - That work is not hidden or rewritten. It is listed below with its real commit times.
  - Every time below comes from the git history, in UTC and in ET (UTC−4).
  - The guide gives the building period as 27 Oct – 4 Nov, while the kickoff was on 26 Oct. We count
    from the kickoff, but the exact times are here so you can check them against either date.
- **No Meta model was called before kickoff.** The Meta Model API key was first added to the build
  machine on 26 Oct at 21:10 UTC, after kickoff. Until then, the code had only run against a scripted
  fake model in the unit tests.

### Before kickoff: a first offline version (26 Oct, 13:59–14:58 UTC)

| Commit | UTC (26 Oct) | ET (26 Oct) | What |
|---|---|---|---|
| `29cfe6e` | 13:59 | 09:59 | Design and implementation plan (`docs/superpowers/`) |
| `a829b59` | 14:27 | 10:27 | Notes on the accent colour, naming and build mode |
| `d860301` | 14:37 | 10:37 | Next.js scaffold and the Meta model client wrapper |
| `c61127e` | 14:39 | 10:39 | Domain types and the sample data (students, sample catalogue) |
| `762b222` | 14:41 | 10:41 | Tawjihi conversion and the requirement checks |
| `e13c81c` | 14:43 | 10:43 | Synthetic sample document images |
| `ac7ac9d` | 14:45 | 10:45 | Arabic voice transcription route |
| `4357ea2` | 14:46 | 10:46 | Arabic interview turn |
| `ead4f1c` | 14:49 | 10:49 | Tool-calling application agent |
| `105978c` | 14:55 | 10:55 | Student flow and counsellor review screens |
| `19adcc8` | 14:58 | 10:58 | Test settings for a low-memory laptop |

At kickoff, this version had never called a Meta model. It was missing:
- document reading;
- document evidence on the review screen;
- the English toggle;
- class mode.

### During the hackathon (from 26 Oct, 16:00 UTC)

- **26 Oct, 21:10 UTC:** the API key was added, and the first real calls to Meta's models were made.

| Commit | UTC | ET | What |
|---|---|---|---|
| `816d86f` | 26 Oct 21:29 | 26 Oct 17:29 | **Document reading with evidence crops** (details below) |
| `d72ac62` | 26 Oct 21:41 | 26 Oct 17:41 | Fixes from the first live runs: Arabic names in the agent trace, a short punctuated summary, a fuller profile panel |
| `83d370c` | 27 Oct 13:04 | 27 Oct 09:04 | **English toggle** for the student flow, the trace, the summary and the counsellor review |
| `66d97ca` | 27 Oct 13:12 | 27 Oct 09:12 | **Class mode**: up to 30 students, 3 at a time, one table, a review link for each student |
| this commit | 30 Oct | 30 Oct | This README and the demo script (`docs/demo-script.md`) |

Document reading (`816d86f`) works like this:
- `sam-3.1` finds the document in each photo and crops it.
- `muse-spark-1.3` reads every field and its box on the page.
- The review screen zooms into each value.
- Photos are cleaned up first (rotation and size), and there is a fallback when no document is found.

The first live runs of the interview, voice transcription and agent on Meta's models also happened
during the hackathon, along with the live test of every screen.

**The demo video highlights only the work in this second list.** When the video shows a screen that
existed at kickoff, it says so.

## Meta models and where they are used

| Model | Used for | Code | When it was built |
|---|---|---|---|
| `sam-3.1` | Finding the document in each photo and cropping it | `lib/documents/segment.ts`, `app/api/documents` | During the hackathon |
| `muse-spark-1.3` | Reading each document field and its box on the page | `lib/documents/extract.ts` | During the hackathon |
| `muse-spark-1.3` | The interview turns and profile extraction | `lib/agent/interview.ts`, `app/api/interview` | Written before kickoff; first live run during the hackathon |
| `muse-spark-1.3` | The tool-calling agent and its Arabic and English summary | `lib/agent/applicationAgent.ts`, `lib/agent/tools.ts` | Loop written before kickoff; live runs, summary and trace fixes during the hackathon |
| `muse-voice-transcribe-1.0` | Arabic speech-to-text | `lib/meta/asr.ts`, `app/api/transcribe` | Written before kickoff; first live use during the hackathon |

The agent's tools are `convert_tawjihi`, `search_programmes`, `check_requirements`,
`fill_application` and `flag_missing`.

Every call goes from the server to `https://api.meta.ai/v1`. The API key never reaches the browser.

## Run it locally

You need Node.js 20 or newer and a Meta Model API key.

```bash
npm install
cp .env.example .env.local   # then put your key in MODEL_API_KEY
npm run dev                  # open http://localhost:3000
```

Other commands:

```bash
npm test         # unit tests, no network (the model is a scripted fake)
npm run smoke    # one live call to muse-spark-1.3 (needs MODEL_API_KEY in your shell)
```

Sample photos to try are in `public/samples/`.

## How it works

- **Stack:** Next.js (App Router), TypeScript and Tailwind, with Vitest for the tests.
- **Server routes:** `/api/transcribe`, `/api/interview` and `/api/documents` call Meta's models.
  `/api/agent` also calls them, and streams the trace to the page as server-sent events.
- **No database and no accounts:** the session lives in the browser.
- **Rules:** the Tawjihi bands, the requirement checks and the form filling are plain functions, tested
  without the network.
- **Model:** it sits behind one small interface, so the agent loop can be tested with a scripted fake.

## Limitations

- **Sample data only.** The universities, programmes and admission rules are fictional. This is not
  advice for real applications.
- **Approximate boxes.** Muse Spark's field boxes are off by about 2–3% of the page, so the review
  zooms in with some padding around each value.
- **Speed.** Reading one document takes about 13–21 seconds, and a full agent run about 25 seconds.
- **Class mode** uses the sample students without documents, so every field there needs the
  counsellor.
- **Nothing is sent to any university.** There are no accounts and no payments.
- **Voice** needs microphone permission. Typing works too.

## Licence and credits

MIT licence (see `LICENSE`). Built by Khalid Bakroun, founder of Nara Abroad, with an AI coding
assistant. Every commit credits the assistant.
