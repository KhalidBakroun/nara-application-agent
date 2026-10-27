"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { InterviewMessage } from "@/lib/agent/interview";
import type { ApplicationPack, StudentProfile, TraceEvent } from "@/lib/domain/types";
import type { ExtractedDocument } from "@/lib/documents/extract";
import { startRecording } from "@/lib/audio/recorder";
import { useLang } from "@/lib/i18n";
import { saveSession } from "@/lib/session";
import { readServerEvents } from "@/lib/sse";

const FIRST_QUESTION = "مرحباً! أنا وكيل نارا، وسأساعدك في تجهيز طلبك الجامعي. ما اسمك الكامل؟";

const SAMPLE_SETS: { ar: string; en: string; paths: string[] }[] = [
  { ar: "لينا", en: "Lina", paths: ["/samples/lina-tawjihi.jpg", "/samples/lina-english.jpg"] },
  { ar: "عمر", en: "Omar", paths: ["/samples/omar-tawjihi.jpg"] },
  { ar: "سارة", en: "Sara", paths: ["/samples/sara-tawjihi.jpg", "/samples/sara-english.jpg"] },
];

const emptyProfile: StudentProfile = { englishTest: { type: "none" }, targetCountries: [], sources: {} };

function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ar-SA";
    window.speechSynthesis.speak(u);
  } catch {
    /* reading aloud is optional */
  }
}

export function StudentFlow() {
  const { t, lang, labels } = useLang();
  const [history, setHistory] = useState<InterviewMessage[]>([{ role: "agent", text: FIRST_QUESTION }]);
  const [profile, setProfile] = useState<StudentProfile>(emptyProfile);
  const [interviewDone, setInterviewDone] = useState(false);
  const [typed, setTyped] = useState("");
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ExtractedDocument[]>([]);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [pack, setPack] = useState<ApplicationPack | null>(null);
  const [summary, setSummary] = useState<{ ar?: string; en?: string } | null>(null);
  const recorderRef = useRef<{ stop: () => Promise<Blob> } | null>(null);

  async function answer(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const nextHistory: InterviewMessage[] = [...history, { role: "student", text: clean }];
    setHistory(nextHistory);
    setBusy(t("thinking"));
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: nextHistory, profile }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Interview failed");
      setProfile(body.profile);
      setInterviewDone(body.done);
      setHistory([...nextHistory, { role: "agent", text: body.nextQuestionAr }]);
      speak(body.nextQuestionAr);
    } catch (err) {
      setNotice(t("agentUnreachable", { error: (err as Error).message }));
    } finally {
      setBusy(null);
    }
  }

  async function toggleMic() {
    setNotice(null);
    if (!recording) {
      try {
        recorderRef.current = await startRecording();
        setRecording(true);
      } catch {
        setNotice(t("noMic"));
      }
      return;
    }
    setRecording(false);
    setBusy(t("listening"));
    try {
      const wav = await recorderRef.current!.stop();
      const form = new FormData();
      form.set("audio", wav, "answer.wav");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Transcription failed");
      if (body.empty) setNotice(t("notHeard"));
      else await answer(body.transcript);
    } catch (err) {
      setNotice(`${t("notHeard")} (${(err as Error).message})`);
    } finally {
      setBusy(null);
    }
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setBusy(t("readingDocuments"));
    setNotice(null);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Document reading failed");
      setDocuments((d) => [...d, ...(body.documents as ExtractedDocument[])]);
    } catch (err) {
      setNotice(t("documentsFailed", { error: (err as Error).message }));
    } finally {
      setBusy(null);
    }
  }

  async function loadSamples(paths: string[]) {
    const files = await Promise.all(
      paths.map(async (p) => {
        const blob = await (await fetch(p)).blob();
        return new File([blob], p.split("/").at(-1)!, { type: "image/jpeg" });
      }),
    );
    await uploadFiles(files);
  }

  async function runAgent() {
    setBusy(t("agentWorking"));
    setTrace([]);
    setPack(null);
    setNotice(null);
    const steps: TraceEvent[] = [];
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, documents }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Agent failed");
      let failure: string | null = null;
      await readServerEvents(res, (event, payload) => {
        if (event === "trace") {
          steps.push(payload as TraceEvent);
          setTrace([...steps]);
        } else if (event === "pack") {
          const data = payload as { pack: ApplicationPack; summaryAr?: string; summaryEn?: string };
          setPack(data.pack);
          setSummary({ ar: data.summaryAr, en: data.summaryEn });
          saveSession({ profile, documents, trace: steps, pack: data.pack, summaryAr: data.summaryAr, summaryEn: data.summaryEn });
        } else if (event === "error") {
          failure = (payload as { message: string }).message;
        }
      });
      if (failure) throw new Error(failure);
    } catch (err) {
      setNotice(t("agentStopped", { error: (err as Error).message }));
    } finally {
      setBusy(null);
    }
  }

  const known = Object.entries({
    [t("name")]: profile.fullName,
    [t("nationality")]: profile.nationality,
    [t("tawjihiAverage")]: profile.tawjihiAverage,
    [t("stream")]: profile.stream && (labels.stream[profile.stream] ?? profile.stream),
    [t("graduationYear")]: profile.graduationYear,
    [t("fieldOfStudy")]: profile.fieldOfStudy,
    [t("countries")]: profile.targetCountries.join(lang === "ar" ? "، " : ", ") || undefined,
    [t("englishTest")]: profile.englishTest.type === "none" ? undefined : `${profile.englishTest.type} ${profile.englishTest.score ?? ""}`,
    [t("budget")]: profile.budgetUsdPerYear ? t("usd", { n: profile.budgetUsdPerYear }) : undefined,
  }).filter(([, v]) => v !== undefined && v !== "");
  const summaryText = summary && (lang === "en" ? summary.en ?? summary.ar : summary.ar);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold">{t("interviewTitle")}</h2>
          {t("interviewNote") && <p className="mt-1 text-sm text-muted">{t("interviewNote")}</p>}
          <ol className="mt-4 space-y-3">
            {history.map((m, i) => (
              <li key={i} className={`rounded-xl p-3 ${m.role === "agent" ? "bg-accent-soft" : "me-8 bg-background"}`}>
                <span className="text-xs font-bold text-muted">{m.role === "agent" ? t("agentName") : t("student")}</span>
                <p className="mt-1" dir="rtl" lang="ar">
                  {m.text}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleMic}
              disabled={Boolean(busy) && !recording}
              className={`rounded-full px-5 py-3 font-bold text-white ${recording ? "bg-warn" : "bg-accent"} disabled:opacity-40`}
            >
              {recording ? t("stopAndSend") : t("speak")}
            </button>
            <form
              className="flex flex-1 gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void answer(typed);
                setTyped("");
              }}
            >
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={t("typePlaceholder")}
                dir="auto"
                className="flex-1 rounded-full border border-line px-4"
              />
              <button type="submit" disabled={Boolean(busy)} className="rounded-full border border-accent px-4 text-accent disabled:opacity-40">
                {t("send")}
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold">{t("documentsTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("documentsHint")}</p>
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-3 block"
            onChange={(e) => void uploadFiles(Array.from(e.target.files ?? []))}
          />
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="text-muted">{t("sampleDocuments")}</span>
            {SAMPLE_SETS.map((s) => (
              <button key={s.en} type="button" className="rounded-full border border-line px-3 py-1" onClick={() => void loadSamples(s.paths)}>
                {lang === "ar" ? s.ar : s.en}
              </button>
            ))}
          </div>
          {documents.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {documents.map((d) => (
                <li key={d.documentId}>
                  ✓ {labels.docType[d.docType] ?? d.docType} — {t("fieldsRead", { n: d.fields.length })}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold">{t("agentTitle")}</h2>
          <button
            type="button"
            onClick={runAgent}
            disabled={Boolean(busy) || (!interviewDone && documents.length === 0)}
            className="mt-3 rounded-xl bg-accent px-6 py-3 font-bold text-white disabled:opacity-40"
          >
            {t("runAgent")}
          </button>
          {trace.length > 0 && (
            <ol className="mt-4 space-y-2">
              {trace.map((s) => (
                <li key={s.step} className="rounded-lg border border-line p-3">
                  <span className="font-mono text-xs text-muted" dir="ltr">
                    {s.step}. {s.tool}
                  </span>
                  <p>{lang === "en" ? s.summaryEn ?? s.summaryAr : s.summaryAr}</p>
                </li>
              ))}
            </ol>
          )}
          {pack && (
            <div className="mt-4 rounded-xl bg-ok-soft p-4">
              {summaryText && (
                <p className="mb-3" dir="auto">
                  {summaryText}
                </p>
              )}
              <Link href="/review" className="inline-block rounded-lg bg-ok px-5 py-2 font-bold text-white">
                {t("openReview")}
              </Link>
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-bold">{t("knownTitle")}</h2>
          {known.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{t("nothingYet")}</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              {known.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-line pb-1">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium" dir="auto">
                    {String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
        {busy && <p className="rounded-xl bg-accent-soft p-3 text-accent">{busy}</p>}
        {notice && <p className="rounded-xl bg-warn-soft p-3 text-warn">{notice}</p>}
        <p className="text-xs text-muted">{t("sampleNote")}</p>
      </aside>
    </div>
  );
}
