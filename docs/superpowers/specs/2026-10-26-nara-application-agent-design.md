# Nara Application Agent: design (Meta Global AI Developer Hackathon, startup track)

Approved by Khalid on 26 Oct 2026 ("handle it and I agree go"). Built by Khalid and Claude together.

## Why
Arab students and their school counsellors spend days on study-abroad applications: collecting grades
from photos of certificates, working out whether a Tawjihi score is enough, picking courses, filling
forms, and chasing missing documents. Families pay agents USD 300-500 just for advice. Nara's real model
is that schools bring whole classes and a person checks every application. This demo shows an agent doing
the counsellor's paperwork, with a human approving every field.

## What it is
A web app with two screens:
1. **Student flow (Arabic first, English toggle).**
   - The student speaks in Arabic. The agent interviews them: grades, stream, goals, budget, country
     preferences and English level.
   - The student uploads photos of their Tawjihi certificate and other documents.
   - The agent then runs on its own and shows a live trace of each step:
     1. reads the documents;
     2. converts the Tawjihi grades;
     3. checks entry requirements;
     4. builds a shortlist with reasons in plain Arabic;
     5. fills the application form for the chosen programme;
     6. lists anything missing.
2. **Counsellor review.** Every filled field shows its value, where it came from (an evidence crop of the
   document, or a quote from the interview), and a confidence level. The counsellor approves or edits each
   field and the whole application pack.

**Stretch: class mode.** A counsellor uploads several students' documents at once, and the agent prepares
all their packs in parallel into one table.

## Goals
- Win points on the rubric:
  - **impact (30%):** a real problem for Arab students;
  - **use of Meta tooling (25%):** voice, vision, segmentation and tool calling, all Meta models;
  - **technical depth (20%):** an agent loop with tools and verifiable sources;
  - **demo (25%):** one student from first word to a reviewed pack in under 3 minutes of video.
- Aim for the Best Agentic Use-Case bonus prize.

## Non-goals and anti-goals
- **Not a chatbot that answers questions.** The hackathon bans "simple AI for Education chatbots" and
  "basic RAG apps". If the demo looks like Q&A, it fails, even if it works.
- **No Nara private code, no real student data, no internal security details.** The repo is public and
  Meta gets a licence to everything submitted.
- **No real submission to universities, and no payments or accounts.**
- **No invented facts about real universities.** The programme catalogue and the grade-conversion rules are
  *sample data*, clearly labelled as such in the UI and README.

## Meta models used
- `muse-voice-transcribe-1.0`: Arabic speech-to-text, `POST https://api.meta.ai/v1/asr/transcribe`, WAV
  16-bit mono 16 kHz, `languageBias: ["Arabic", "English"]`.
- `muse-spark-1.3`, through the Responses API at `https://api.meta.ai/v1` with the OpenAI SDK:
  - the interview turns and profile extraction;
  - document reading with field bounding boxes;
  - the tool-calling agent loop;
  - Arabic explanations.
- `sam-3.1`: finds and crops the document in each photo (prompt "document"), so every extracted field is
  shown on a clean crop.

## Constraints
- **Deadline:** Thu 5 Nov 2026, 05:00 Amman (Wed 4 Nov, 21:00 ET).
- **Submission:** a public repo, a 3-minute demo video and a live product.
- **New work only.** All code is written during the hackathon (from 26 Oct) in this repo.
- **API key:** `MODEL_API_KEY` stays server-side only. It is stored locally in `~/.nara-secrets/` and never
  committed.
- **Nothing goes online without Khalid's OK.** Nothing is pushed or deployed until Khalid says so; this is
  the "never push" standing rule.

## The how, as decided
- **Next.js (App Router) + TypeScript + Tailwind, Vitest for tests.** This is my call; Khalid knows
  React/Next.js.
- **Recording:**
  - the browser records the voice and encodes a WAV in the browser, so no ffmpeg is needed on the server;
  - the session state lives in the browser, so no database is needed; this is my call for a stateless
    deployment.
- **Agent design:**
  - one tool-calling loop on the server, streaming trace events to the page;
  - tools: `convert_tawjihi`, `search_programmes`, `check_requirements`, `fill_application`,
    `flag_missing`;
  - at most 12 steps.
- **Verification:** each filled field must carry a `source`, either a document field with its crop, or an
  interview quote. A field without a source is shown as "needs counsellor".
- **Demo data:**
  - three synthetic student personas;
  - sample certificate images rendered from HTML, watermarked "SAMPLE: DEMO DATA";
  - a catalogue of about 12 fictional but realistic programmes.
- **Branding:**
  - Nara palette;
  - the accent is to be confirmed by Khalid (primary blue-teal `#2E7E8F` or secondary fuchsia
    `#D946EF`);
  - the UI says "Nara Agent"; the README names the Meta models, as the hackathon requires.

## Left to the builder
The page layout details, component split, prompt wording, retry and backoff handling, and the exact
sample-data values (within the rules above).
