"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { InterviewMessage } from "@/lib/agent/interview";
import type { ApplicationPack, StudentProfile, TraceEvent } from "@/lib/domain/types";
import type { ExtractedDocument } from "@/lib/documents/extract";
import { startRecording } from "@/lib/audio/recorder";
import { saveSession } from "@/lib/session";

const FIRST_QUESTION = "مرحباً! أنا وكيل نارا، وسأساعدك في تجهيز طلبك الجامعي. ما اسمك الكامل؟";
const NOT_HEARD = "لم أسمعك جيداً، أعد المحاولة";

const SAMPLE_SETS: Record<string, string[]> = {
  "لينا": ["/samples/lina-tawjihi.jpg", "/samples/lina-english.jpg"],
  "عمر": ["/samples/omar-tawjihi.jpg"],
  "سارة": ["/samples/sara-tawjihi.jpg", "/samples/sara-english.jpg"],
};

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
  const [summary, setSummary] = useState<string | null>(null);
  const recorderRef = useRef<{ stop: () => Promise<Blob> } | null>(null);

  async function answer(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const nextHistory: InterviewMessage[] = [...history, { role: "student", text: clean }];
    setHistory(nextHistory);
    setBusy("يفكّر الوكيل…");
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
      setNotice(`تعذّر الاتصال بالوكيل: ${(err as Error).message}`);
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
        setNotice("لا يمكن الوصول إلى الميكروفون. يمكنك كتابة إجابتك بدلاً من ذلك.");
      }
      return;
    }
    setRecording(false);
    setBusy("أستمع إلى إجابتك…");
    try {
      const wav = await recorderRef.current!.stop();
      const form = new FormData();
      form.set("audio", wav, "answer.wav");
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Transcription failed");
      if (body.empty) setNotice(NOT_HEARD);
      else await answer(body.transcript);
    } catch (err) {
      setNotice(`${NOT_HEARD} (${(err as Error).message})`);
    } finally {
      setBusy(null);
    }
  }

  async function uploadFiles(files: File[]) {
    if (files.length === 0) return;
    setBusy("يقرأ الوكيل الوثائق…");
    setNotice(null);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      const res = await fetch("/api/documents", { method: "POST", body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Document reading failed");
      setDocuments((d) => [...d, ...(body.documents as ExtractedDocument[])]);
    } catch (err) {
      setNotice(`تعذّرت قراءة الوثائق: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function useSamples(paths: string[]) {
    const files = await Promise.all(
      paths.map(async (p) => {
        const blob = await (await fetch(p)).blob();
        return new File([blob], p.split("/").at(-1)!, { type: "image/jpeg" });
      }),
    );
    await uploadFiles(files);
  }

  async function runAgent() {
    setBusy("يعمل الوكيل على ملفك…");
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
      if (!res.ok || !res.body) throw new Error((await res.json()).error ?? "Agent failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const raw of events) {
          const event = raw.match(/^event: (.+)$/m)?.[1];
          const data = JSON.parse(raw.match(/^data: (.+)$/m)?.[1] ?? "null");
          if (event === "trace") {
            steps.push(data);
            setTrace([...steps]);
          } else if (event === "pack") {
            setPack(data.pack);
            setSummary(data.summaryAr ?? null);
            saveSession({ profile, documents, trace: steps, pack: data.pack, summaryAr: data.summaryAr });
          } else if (event === "error") {
            throw new Error(data.message);
          }
        }
      }
    } catch (err) {
      setNotice(`توقّف الوكيل: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  const known = Object.entries({
    "الاسم": profile.fullName,
    "معدل التوجيهي": profile.tawjihiAverage,
    "الفرع": profile.stream,
    "التخصص": profile.fieldOfStudy,
    "الدول": profile.targetCountries.join("، ") || undefined,
    "اللغة الإنجليزية": profile.englishTest.type === "none" ? undefined : `${profile.englishTest.type} ${profile.englishTest.score ?? ""}`,
    "الميزانية": profile.budgetUsdPerYear ? `${profile.budgetUsdPerYear} دولار` : undefined,
  }).filter(([, v]) => v !== undefined && v !== "");

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold">١. المقابلة الصوتية</h2>
          <ol className="mt-4 space-y-3">
            {history.map((m, i) => (
              <li key={i} className={`rounded-xl p-3 ${m.role === "agent" ? "bg-accent-soft" : "me-8 bg-background"}`}>
                <span className="text-xs font-bold text-muted">{m.role === "agent" ? "وكيل نارا" : "الطالب"}</span>
                <p className="mt-1">{m.text}</p>
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
              {recording ? "■ إيقاف وإرسال" : "🎙 تحدّث"}
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
                placeholder="أو اكتب إجابتك هنا"
                className="flex-1 rounded-full border border-line px-4"
              />
              <button type="submit" disabled={Boolean(busy)} className="rounded-full border border-accent px-4 text-accent disabled:opacity-40">
                إرسال
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold">٢. صوّر وثائقك</h2>
          <p className="mt-1 text-sm text-muted">شهادة التوجيهي، جواز السفر، نتيجة اختبار اللغة…</p>
          <input
            type="file"
            accept="image/*"
            multiple
            className="mt-3 block"
            onChange={(e) => void uploadFiles(Array.from(e.target.files ?? []))}
          />
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="text-muted">وثائق تجريبية:</span>
            {Object.entries(SAMPLE_SETS).map(([name, paths]) => (
              <button key={name} type="button" className="rounded-full border border-line px-3 py-1" onClick={() => void useSamples(paths)}>
                {name}
              </button>
            ))}
          </div>
          {documents.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {documents.map((d) => (
                <li key={d.documentId}>
                  ✓ {d.docType} — {d.fields.length} حقول مقروءة
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-xl font-bold">٣. دع الوكيل يعمل</h2>
          <button
            type="button"
            onClick={runAgent}
            disabled={Boolean(busy) || (!interviewDone && documents.length === 0)}
            className="mt-3 rounded-xl bg-accent px-6 py-3 font-bold text-white disabled:opacity-40"
          >
            شغّل وكيل نارا
          </button>
          {trace.length > 0 && (
            <ol className="mt-4 space-y-2">
              {trace.map((t) => (
                <li key={t.step} className="rounded-lg border border-line p-3">
                  <span className="font-mono text-xs text-muted" dir="ltr">
                    {t.step}. {t.tool}
                  </span>
                  <p>{t.summaryAr}</p>
                </li>
              ))}
            </ol>
          )}
          {pack && (
            <div className="mt-4 rounded-xl bg-ok-soft p-4">
              {summary && <p className="mb-3">{summary}</p>}
              <Link href="/review" className="inline-block rounded-lg bg-ok px-5 py-2 font-bold text-white">
                افتح مراجعة المرشد ←
              </Link>
            </div>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-bold">ما يعرفه الوكيل عنك</h2>
          {known.length === 0 ? (
            <p className="mt-2 text-sm text-muted">لا شيء بعد.</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              {known.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-line pb-1">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-medium">{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
        {busy && <p className="rounded-xl bg-accent-soft p-3 text-accent">{busy}</p>}
        {notice && <p className="rounded-xl bg-warn-soft p-3 text-warn">{notice}</p>}
        <p className="text-xs text-muted">
          بيانات تجريبية للعرض فقط: الجامعات وقواعد القبول في هذا العرض افتراضية. Sample data for the demo.
        </p>
      </aside>
    </div>
  );
}
