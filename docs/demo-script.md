# Demo script (3 minutes)

**The rule.** The participant guide says: "Your demo must only highlight the specific features, code,
and functionality that you built during the Hackathon."

**So the video highlights:**
- document reading with evidence;
- the evidence on the counsellor review screen;
- the English toggle;
- class mode.

Screens that already existed at kickoff appear only briefly, and the voice-over says so. The full
before/after list is in the README.

If we build more before 4 Nov, add it to the README's "During the hackathon" list and give it a slot
here.

## Before recording

- Run `npm run dev` with `MODEL_API_KEY` set, or use the live URL once it is deployed.
- Set the browser to 1280×800, with the Arabic interface and a fresh session.
- Use the student "Lina" and the photos `public/samples/lina-tawjihi.jpg` and
  `public/samples/lina-english.jpg`.
- Do one full practice run first, so the slow steps (about 15–20 seconds per document) can be cut in
  editing.

## The script

| Time | On screen | Say |
|---|---|---|
| 0:00–0:15 | Title card: "Nara Agent: built on Meta's models. Sample data for the demo." | "Arab students and their school counsellors lose days on applications: grades copied from photos, forms, missing papers. Nara Agent does the paperwork, and a counsellor approves every field." |
| 0:15–0:30 | The student page. Type Lina's two answers (or speak them). | "This interview screen comes from our first version, written just before kickoff. Everything we show next was built during the hackathon." |
| 0:30–1:15 | **New.** Upload Lina's Tawjihi certificate and English report. Show the cropped page and the fields that were read. | "SAM 3.1 finds the certificate in the photo and crops it. Muse Spark then reads every grade and marks where it sits on the page. Arabic digits are kept as written." |
| 1:15–1:35 | Run the agent. Show the live trace for a few seconds, then cut to the result. | "The agent loop was in our first version. During the hackathon we ran it live on Muse Spark and fixed what those runs showed: Arabic names in the trace and a short summary." |
| 1:35–2:15 | **New.** Open the counsellor review. Click a grade: the zoomed crop with the value highlighted. Show the interview quote for the field of study and "needs counsellor" on the programme. Approve the fields, then press Approve pack. | "The review screen existed at kickoff. The proof on it is new: every value comes with the piece of the document it was read from. If there's no proof, the counsellor decides." |
| 2:15–2:30 | **New.** Switch to English. Show the trace, the summary and the review in English. | "Counsellors and parents can switch the whole flow to English." |
| 2:30–2:55 | **New.** Open `/class` and run three sample students. Watch the table fill in, then open one pack. | "Class mode: a counsellor runs a whole class at once. Each row shows the best programme, the entry route and what's missing." |
| 2:55–3:00 | The repo link. | "Nara Agent. The agent does the paperwork; the counsellor checks. Sample data for the demo." |

**If the video runs long:** cut the 0:15–0:30 context and shorten the agent trace. Never cut the
document reading, the review evidence or class mode.
