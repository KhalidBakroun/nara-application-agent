# Nara Application Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public, working demo where a student speaks Arabic and uploads certificate photos, and an
agent built on Meta models produces a verified application pack. A counsellor then reviews it field by
field.

**Architecture:**
- **Framework:** a Next.js App Router app. Server routes call the Meta Model API (the key stays on the
  server).
- **Pure domain logic:** Tawjihi conversion, requirement checks and form filling live in `lib/rules` and
  `lib/agent/tools`, and are unit-tested without the network.
- **The model:** sits behind one small `ModelClient` interface, so the agent loop is tested with a
  scripted fake.
- **Session state:** lives in the browser.

**Tech Stack:**
- Next.js 15, TypeScript 5, Tailwind 4, Vitest 3;
- `openai` npm SDK (base URL `https://api.meta.ai/v1`), `zod` 3, `sharp`;
- `puppeteer-core` for the sample images only.

**Spec:** `docs/superpowers/specs/2026-10-26-nara-application-agent-design.md`

## Global Constraints
- **Models:**
  - `muse-spark-1.3` for the interview, document reading and the agent;
  - `muse-voice-transcribe-1.0` for voice;
  - `sam-3.1` for document segmentation.
- **API:** base URL `https://api.meta.ai/v1`; env var `MODEL_API_KEY`, used server-side only and never sent
  to the browser.
- **ASR:** `POST https://api.meta.ai/v1/asr/transcribe` as `multipart/form-data` with two parts:
  - `request` (JSON): `{"mode":"PUSH_TO_TALK","model":"muse-voice-transcribe-1.0","audioEncoding":"WAV","languageBias":["Arabic","English"]}`;
  - `audio` (WAV, mono, 16-bit PCM, 16 kHz, at most 10 minutes and 32 MB).
- **Images:** at most 50 per request, as base64 data URLs (`data:image/jpeg;base64,...`).
- **Agent:** at most 12 steps per run.
- **Sources:** every `ApplicationField` without a `source` renders as "needs counsellor".
- **Sample data:** all of it is synthetic. The UI and README label the catalogue and rules "Sample data
  for the demo". Sample images carry the watermark "SAMPLE: DEMO DATA".
- **UI:** Arabic first (`dir="rtl"`, `lang="ar"`) with an English toggle. The product name in the UI is
  "Nara Agent".
- **Repo:** new work only, MIT licence, and no code copied from Nara's private repos.
- **Secrets:** `.env.local` and `~/.nara-secrets/*` never enter git.
- **Nothing online without Khalid's OK.** No push and no deploy until he says so.

## Review Focus
1. **Arabic-Indic digits.** A score written as "٨٥٫٤" or "85,4" must parse as 85.4. (Task 3:
   `parseScore` tests.)
2. **Silent or empty audio.** The ASR returns an empty transcript. The UI shows "لم أسمعك جيداً، أعد
   المحاولة" and keeps the session; it does not crash. (Task 4: empty-transcript route test.)
3. **A photo that isn't a document, or SAM finds no match.** Fall back to the full image, set every field
   to `confidence: "low"`, and send it to the counsellor. (Task 6: no-match test.)
4. **The model returns invalid tool arguments or bad JSON.** The error goes back to the model as the tool
   result and the loop continues. A 429 or 5xx error is retried once after 2 s, then shown as a clear
   error. (Task 7: malformed-args and retry tests.)
5. **No English test.** The requirement check reports `IELTS needed: 6.0` rather than crashing, and
   programmes with a foundation route stay on the shortlist. (Task 3: no-English-test test.)

---

### Task 1: Project scaffold and Meta client
**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`,
  `.env.example`, `LICENSE`, `app/layout.tsx`, `app/page.tsx`
- Create: `lib/meta/client.ts`, `lib/meta/modelClient.ts`, `scripts/smoke.ts`
- Test: `tests/meta/client.test.ts`

**Interfaces:**
- Produces:
  - `getMetaClient(): OpenAI`, which throws `Error("MODEL_API_KEY is not set")` when the env var is
    missing;
  - `interface ModelClient { respond(req: ModelRequest): Promise<ModelTurn> }`, where
    `ModelTurn = { text?: string; toolCalls: { id: string; name: string; args: string }[] }`;
  - `createMetaModelClient(): ModelClient`, which wraps `responses.create` with `model: "muse-spark-1.3"`
    and retries once after 2 s on 429 or 5xx.

- [ ] Step 1: Scaffold with `npx create-next-app@15 . --ts --tailwind --app --no-src-dir --eslint`, then
  add `vitest`, `openai`, `zod` and `sharp`. `.gitignore` covers `.env*` except `.env.example`.
- [ ] Step 2: Write the failing tests:
  - `getMetaClient` uses `baseURL === "https://api.meta.ai/v1"`;
  - it throws `"MODEL_API_KEY is not set"` without the env var;
  - `createMetaModelClient` retries once on a 429 (mock the SDK) and throws after a second 429.
- [ ] Step 3: Run `npx vitest run tests/meta`. Expected: FAIL.
- [ ] Step 4: Implement `lib/meta/client.ts` and `lib/meta/modelClient.ts`.
- [ ] Step 5: Run `npx vitest run tests/meta`. Expected: PASS.
- [ ] Step 6: Run `npx tsx scripts/smoke.ts`, with the key loaded from
  `~/.nara-secrets/meta-model-api-key.txt` into `MODEL_API_KEY`. Expected: it prints a muse-spark-1.3
  reply. **Do not print the key.**
- [ ] Step 7: Commit with `git commit -m "feat: scaffold app and Meta model client"`.

### Task 2: Domain types and sample data
**Files:**
- Create: `lib/domain/types.ts`, `lib/domain/schemas.ts` (zod), `data/programmes.json`,
  `data/personas.json`
- Test: `tests/domain/data.test.ts`

**Interfaces:**
- Produces these types, mirrored as zod schemas, in `lib/domain/types.ts`:
  - `Stream = "scientific" | "literary" | "it" | "other"`;
  - `SourceRef`, one of:
    - `{ kind: "document"; documentId: string; fieldKey: string; box: [number, number, number, number] }`
      (box is x0, y0, x1, y1 in pixels of the cropped page);
    - `{ kind: "interview"; turn: number; quote: string }`;
  - `StudentProfile`, with these fields:
    - `fullName?`, `nationality?`, `tawjihiAverage?` (number), `stream?`, `graduationYear?`;
    - `englishTest: { type: "IELTS" | "TOEFL" | "none"; score?: number }`;
    - `targetCountries: string[]`, `fieldOfStudy?`, `budgetUsdPerYear?`;
    - `sources: Partial<Record<keyof StudentProfile, SourceRef>>`;
  - `Programme = { id, university, country, name, field, tuitionUsdPerYear, minTawjihi, acceptedStreams: Stream[], minIelts, foundationAvailable: boolean, requiredDocuments: string[] }`;
  - `Check = { rule: "tawjihi" | "stream" | "english" | "budget"; passed: boolean; detail: string }`;
  - `ApplicationField = { key: string; label: string; labelAr: string; value: string; source?: SourceRef; confidence: "high" | "medium" | "low" }`;
  - `ShortlistItem = { programmeId: string; eligible: boolean; viaFoundation: boolean; checks: Check[]; reasonAr: string }`;
  - `ApplicationPack = { programmeId: string; fields: ApplicationField[]; missing: string[]; shortlist: ShortlistItem[] }`;
  - `TraceEvent = { step: number; tool: string; input: unknown; output: unknown; summaryAr: string }`.

- [ ] Step 1: Write the failing test:
  - `data/programmes.json` has 12 programmes that all pass `ProgrammeSchema`;
  - the countries cover at least UK, Ireland, Netherlands, Malaysia and Turkey;
  - each university name ends with "(sample)";
  - `data/personas.json` has 3 personas:
    - "Lina": 92.1, scientific, IELTS 6.5;
    - "Omar": 78.4, literary, no English test;
    - "Sara": 85.0, IT, IELTS 6.0.
- [ ] Step 2: Run `npx vitest run tests/domain`. Expected: FAIL.
- [ ] Step 3: Write the types, schemas and JSON files.
- [ ] Step 4: Run `npx vitest run tests/domain`. Expected: PASS.
- [ ] Step 5: Commit with `git commit -m "feat: domain types and sample data"`.

### Task 3: Rules: score parsing, Tawjihi conversion and requirement checks
**Files:**
- Create: `lib/rules/score.ts`, `lib/rules/tawjihi.ts`, `lib/rules/requirements.ts`
- Test: `tests/rules/*.test.ts`

**Interfaces:**
- Produces:
  - `parseScore(text: string): number`. It accepts Arabic-Indic digits, `٫` or `,` as the decimal mark,
    and an optional `%`. It throws `RangeError` outside 0–100.
  - `convertTawjihi(avg: number): { band: "A" | "B" | "C" | "D"; directEntry: boolean; foundationRecommended: boolean; noteAr: string }`.
    The bands (sample rules) are A ≥ 90, B ≥ 80, C ≥ 70, D < 70. `directEntry = avg >= 80`.
  - `checkProgramme(p: StudentProfile, prog: Programme): ShortlistItem`, with `reasonAr` filled by a
    template.

- [ ] Step 1: Write the failing tests:
  - `parseScore("٨٥٫٤") === 85.4`, `parseScore("85,4%") === 85.4`, and `parseScore("120")` throws;
  - `convertTawjihi(92.1).band === "A"`, `convertTawjihi(78.4)` gives `{ band: "C", directEntry: false, foundationRecommended: true }`;
  - for 85, scientific, IELTS 6.0, budget 15000, against `{ minTawjihi: 80, acceptedStreams: ["scientific"], minIelts: 6.0, tuitionUsdPerYear: 14000 }`:
    `eligible: true` and all 4 checks passed;
  - with `minIelts: 6.5`: `eligible: false`, and the english detail contains "6.5";
  - for an English test of `"none"`: the english check fails with detail "IELTS needed: 6.0", and with
    `foundationAvailable: true` and avg 78.4 the result is `viaFoundation: true`.
- [ ] Step 2: Run `npx vitest run tests/rules`. Expected: FAIL.
- [ ] Step 3: Implement the three functions.
- [ ] Step 4: Run `npx vitest run tests/rules`. Expected: PASS.
- [ ] Step 5: Commit with `git commit -m "feat: tawjihi rules and requirement checks"`.

### Task 4: Voice: WAV encoding and the transcription route
**Files:**
- Create: `lib/audio/wav.ts`, `app/api/transcribe/route.ts`, `lib/meta/asr.ts`
- Test: `tests/audio/wav.test.ts`, `tests/api/transcribe.test.ts`

**Interfaces:**
- Produces:
  - `encodeWav(samples: Float32Array, inputRate: number, targetRate = 16000): Uint8Array`, with linear
    resampling, mono, 16-bit;
  - `transcribe(wav: Blob): Promise<{ transcript: string; durationMs: number }>`;
  - `POST /api/transcribe`, which takes form field `audio` and returns `{ transcript, empty: boolean }`.

- [ ] Step 1: Write the failing tests:
  - the WAV bytes start with "RIFF" and contain "WAVE";
  - the sample-rate field is 16000 and bits per sample is 16;
  - 48000 input samples at 48 kHz give a data chunk of 32000 bytes;
  - `transcribe` posts to the ASR URL with `Authorization: Bearer <key>` and the exact `request` JSON from
    Global Constraints (mocked `fetch`);
  - the route returns `{ empty: true }` when the transcript is `""`.
- [ ] Step 2: Run `npx vitest run tests/audio tests/api/transcribe.test.ts`. Expected: FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: Run the same command. Expected: PASS.
- [ ] Step 5: Manual check: record 5 s of Arabic in the browser and see the transcript. This needs the
  key.
- [ ] Step 6: Commit with `git commit -m "feat: arabic voice transcription"`.

### Task 5: Interview step
**Files:**
- Create: `lib/agent/interview.ts`, `app/api/interview/route.ts`
- Test: `tests/agent/interview.test.ts`

**Interfaces:**
- Consumes: `ModelClient` (Task 1), `StudentProfile` (Task 2), `parseScore` (Task 3).
- Produces:
  - `nextInterviewTurn(model: ModelClient, history: { role: "agent" | "student"; text: string }[], profile: StudentProfile): Promise<{ profile: StudentProfile; nextQuestionAr: string; done: boolean }>`.
  - The function uses structured JSON output and merges the update into the profile.
  - Every newly set field gets `sources[field] = { kind: "interview", turn, quote }`.
  - `done` is true when `fullName`, `tawjihiAverage`, `stream`, `fieldOfStudy`, `englishTest.type` and at
    least one target country are all set.

- [ ] Step 1: Write the failing tests:
  - a fake model returning `{ tawjihiAverage: "٨٥", stream: "scientific" }` sets 85 and records an
    interview source with the student's quote;
  - when all required fields are set, the result is `done: true`.
- [ ] Step 2: Run `npx vitest run tests/agent/interview.test.ts`. Expected: FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: Run the same command. Expected: PASS.
- [ ] Step 5: Commit with `git commit -m "feat: arabic interview turn"`.

### Task 6: Documents: segmentation, extraction and evidence crops
**Files:**
- Create: `lib/documents/segment.ts`, `lib/documents/extract.ts`, `lib/documents/crop.ts`,
  `app/api/documents/route.ts`
- Test: `tests/documents/*.test.ts`, plus `tests/fixtures/sam-document.txt` captured from a real response

**Interfaces:**
- Produces:
  - `findDocument(imageDataUrl: string): Promise<{ box: [number, number, number, number] } | null>`.
    It sends the prompt "document" to `sam-3.1` and parses the output as described on
    `https://dev.meta.ai/docs/sam/reading-segmentation`.
  - `cropBox(img: Buffer, box, pad = 12): Promise<Buffer>`, which clamps the box to the image.
  - `type ExtractedDocument = { documentId: string; docType: "tawjihi_certificate" | "passport" | "english_test" | "other"; fields: { key: string; label: string; value: string; box: [number, number, number, number]; confidence: "high" | "medium" | "low" }[]; cropDataUrl?: string }`,
    exported from `lib/documents/extract.ts`.
  - `extractDocument(model: ModelClient, pageDataUrl: string): Promise<ExtractedDocument>`.
  - `POST /api/documents`, which takes image files and returns the extracted documents with a crop data
    URL per field.

- [ ] Step 1: Capture one real `sam-3.1` response for `public/samples/lina-tawjihi.jpg` into the fixture
  (needs Task 9's sample image, or any photo of a page).
- [ ] Step 2: Write the failing tests:
  - the parser reads the fixture into one box inside the image bounds;
  - `findDocument` returns `null` for an empty response;
  - `cropBox` on a 100×100 image with box `[10, 10, 50, 50]` and pad 0 gives 40×40, and a box running
    past the edge is clamped;
  - with a fake model, `extractDocument` validates against the schema and rejects a field missing a box;
  - in the route, when segmentation returns `null`, the full image is used and every field gets
    `confidence: "low"`.
- [ ] Step 3: Run `npx vitest run tests/documents`. Expected: FAIL.
- [ ] Step 4: Implement.
- [ ] Step 5: Run the same command. Expected: PASS.
- [ ] Step 6: Commit with `git commit -m "feat: document reading with evidence crops"`.

### Task 7: The application agent loop and its tools
**Files:**
- Create: `lib/agent/tools.ts`, `lib/agent/applicationAgent.ts`, `app/api/agent/route.ts` (SSE)
- Test: `tests/agent/applicationAgent.test.ts`, `tests/agent/tools.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 and 6.
- Produces:
  - **The tools**, all pure and JSON in, JSON out:
    - `convert_tawjihi({ avg })`;
    - `search_programmes({ field?, countries?, maxTuition? }): Programme[]`;
    - `check_requirements({ programmeId }): ShortlistItem`;
    - `fill_application({ programmeId }): ApplicationField[]`, which takes values and sources from the
      profile and documents and sets `confidence` from the source;
    - `flag_missing({ programmeId }): string[]`, which returns required documents not uploaded and
      required profile fields not set.
  - **The loop:** `runApplicationAgent(model: ModelClient, ctx: { profile: StudentProfile; documents: ExtractedDocument[] }, onEvent: (e: TraceEvent) => void): Promise<{ pack: ApplicationPack; stoppedReason: "done" | "max_steps" }>`.
    The system prompt tells the model to shortlist up to 5 programmes, pick the best eligible one, fill
    it, flag what's missing, and write each `reasonAr` in plain Arabic.
  - **The route:** `POST /api/agent` streams `TraceEvent`s and then `{ pack }` as server-sent events.

- [ ] Step 1: Write the failing tests:
  - **The full run.** A scripted fake model does: `search_programmes`, then two `check_requirements`
    calls, then `fill_application`, then `flag_missing`, then a final text. The result has 5 trace
    events, `stoppedReason: "done"`, and `pack.fields` where `fullName` carries a document source.
  - **The step limit.** A fake that always calls `convert_tawjihi` stops with
    `stoppedReason: "max_steps"` after 12 steps.
  - **Bad arguments.** A tool call with args `"{bad json"` produces a trace event whose output contains
    `"error"`, and the loop continues.
  - **A missing document.** `flag_missing` lists `"passport"` when no passport was uploaded and the
    programme requires one.
- [ ] Step 2: Run `npx vitest run tests/agent`. Expected: FAIL.
- [ ] Step 3: Implement.
- [ ] Step 4: Run the same command. Expected: PASS.
- [ ] Step 5: Manual check: run the agent route with persona "Sara" against the real API, and check the
  trace and the pack.
- [ ] Step 6: Commit with `git commit -m "feat: tool-calling application agent"`.

### Task 8: UI: student flow and counsellor review
**Files:**
- Create: `app/page.tsx` (student flow), `app/review/page.tsx`, `components/*`, `lib/session.ts`
  (browser `localStorage`, wrapped in try/catch), `app/globals.css` (Nara palette)
- Test: `tests/ui/review.test.tsx` (Testing Library)

**Interfaces:**
- Consumes: the routes from Tasks 4–7.
- Produces:
  - **`/` (student flow):**
    - a mic button that records and sends each answer to `/api/transcribe`, then `/api/interview`;
    - the agent's next question in Arabic, with an option to read it aloud through the browser
      `speechSynthesis` (my call);
    - document upload to `/api/documents`;
    - a "Run agent" button with a live trace list.
  - **`/review` (counsellor):**
    - one card per field, showing the value, the evidence crop or interview quote, a confidence chip, and
      Approve / Edit buttons;
    - the missing items list;
    - an "Approve pack" button.

- [ ] Step 1: Write the failing tests:
  - the review page renders `dir="rtl"`;
  - a field without a `source` shows "يحتاج مراجعة المرشد" ("needs counsellor review");
  - pressing Approve on every field enables "Approve pack".
- [ ] Step 2: Run `npx vitest run tests/ui`. Expected: FAIL.
- [ ] Step 3: Implement. Use the accent Khalid picks, from `--nara-accent`.
- [ ] Step 4: Run the same command. Expected: PASS. Then click through persona "Lina" end to end in the
  browser.
- [ ] Step 5: Commit with `git commit -m "feat: student flow and counsellor review UI"`.

### Task 9: Sample documents
**Files:**
- Create: `scripts/make-samples.mjs`, `samples/templates/*.html`, `public/samples/*.jpg`
- Test: `tests/samples/samples.test.ts`

- [ ] Step 1: Write the failing test:
  - each persona has `public/samples/<name>-tawjihi.jpg`;
  - "Lina" and "Sara" also have `-ielts.jpg`;
  - each file is at least 800 px wide.
- [ ] Step 2: Render the HTML templates with `puppeteer-core` using the local Chrome. The certificate
  layout is Arabic, uses the persona's grades, carries the diagonal watermark "SAMPLE: DEMO DATA", and has
  no real logos or seals. Apply a slight rotation and a desk background so SAM has real work to do.
- [ ] Step 3: Run `node scripts/make-samples.mjs`, then `npx vitest run tests/samples`. Expected: PASS.
- [ ] Step 4: Commit with `git commit -m "feat: synthetic sample documents"`.

### Task 10 (stretch, only if Tasks 1–9 are done by Sat 31 Oct): Class mode
**Files:**
- Create: `app/class/page.tsx`
- Modify: `app/api/agent/route.ts` (accept `{ students: [...] }`)
- Test: `tests/agent/class.test.ts`

- [ ] Step 1: Write the failing test: three personas run with a concurrency of 3 produce three packs and
  one summary row each (`name`, `bestProgramme`, `missingCount`).
- [ ] Step 2: Implement, run `npx vitest run tests/agent/class.test.ts` (expected: PASS), then commit.

### Task 11: README, submission and video (Tue 3 – Wed 4 Nov)
**Files:**
- Create: `README.md`, `docs/demo-script.md`, `vercel.json` (if needed)

- [ ] Step 1: Write the README:
  - the problem, and what was built during the hackathon (everything; list it by date from the git log);
  - each Meta model and where it is used;
  - how to run locally;
  - the "Sample data for the demo" note;
  - limitations.
- [ ] Step 2: Write the 3-minute demo script: Lina's voice interview, the photo upload, the live agent
  trace, the counsellor review, and class mode if it was built.
- [ ] Step 3: **Ask Khalid for OK**, then create the public GitHub repo, push, deploy, and smoke-test the
  live URL with persona "Sara".
- [ ] Step 4: Khalid records the video. Submit on the Cerebral Valley page before Thu 5 Nov, 05:00 Amman.
  Khalid posts on X for the Most Viral prize.

## Day plan
| Day | Tasks |
|---|---|
| Mon 26 Oct | Task 1 (needs the API key); kickoff at 19:00 Amman |
| Tue 27 Oct | Tasks 2, 3, 9 |
| Wed 28 Oct | Tasks 4, 5 |
| Thu 29 Oct | Task 6 |
| Fri 30 – Sat 31 Oct | Task 7, then Task 8 |
| Sun 1 Nov | Task 8 polish; Task 10 if on time |
| Mon 2 Nov | Bug fixing, live test with the real API, the deploy dry run (with OK) |
| Tue 3 Nov | Task 11: README, demo script, record the video |
| Wed 4 Nov | Submit (by Thu 05:00 Amman) |
