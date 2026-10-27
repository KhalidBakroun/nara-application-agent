"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  CONFIDENCE_AR,
  CONFIDENCE_EN,
  DOC_TYPE_AR,
  DOC_TYPE_EN,
  MISSING_AR,
  MISSING_EN,
  STREAM_AR,
  STREAM_EN,
} from "@/lib/labels";

export type Lang = "ar" | "en";

/** Screen text. Arabic first; the English toggle is for counsellors and judges who do not read Arabic. */
const ar = {
  appTitle: "وكيل نارا",
  tagline: "تحدّث بالعربية، صوّر وثائقك، وسيجهّز الوكيل ملف تقديمك الجامعي ويتحقق من كل معلومة قبل أن يراجعه المرشد.",
  sampleNote: "بيانات تجريبية للعرض فقط: الجامعات وقواعد القبول في هذا العرض افتراضية.",
  interviewTitle: "١. المقابلة الصوتية",
  interviewNote: "",
  agentName: "وكيل نارا",
  student: "الطالب",
  speak: "🎙 تحدّث",
  stopAndSend: "■ إيقاف وإرسال",
  typePlaceholder: "أو اكتب إجابتك هنا",
  send: "إرسال",
  documentsTitle: "٢. صوّر وثائقك",
  documentsHint: "شهادة التوجيهي، جواز السفر، نتيجة اختبار اللغة…",
  sampleDocuments: "وثائق تجريبية:",
  fieldsRead: "{n} حقول مقروءة",
  agentTitle: "٣. دع الوكيل يعمل",
  runAgent: "شغّل وكيل نارا",
  openReview: "افتح مراجعة المرشد ←",
  knownTitle: "ما يعرفه الوكيل عنك",
  nothingYet: "لا شيء بعد.",
  name: "الاسم",
  nationality: "الجنسية",
  tawjihiAverage: "معدل التوجيهي",
  stream: "الفرع",
  graduationYear: "سنة التخرج",
  fieldOfStudy: "التخصص",
  countries: "الدول",
  englishTest: "اللغة الإنجليزية",
  budget: "الميزانية",
  usd: "{n} دولار",
  thinking: "يفكّر الوكيل…",
  listening: "أستمع إلى إجابتك…",
  readingDocuments: "يقرأ الوكيل الوثائق…",
  agentWorking: "يعمل الوكيل على ملفك…",
  notHeard: "لم أسمعك جيداً، أعد المحاولة",
  noMic: "لا يمكن الوصول إلى الميكروفون. يمكنك كتابة إجابتك بدلاً من ذلك.",
  agentUnreachable: "تعذّر الاتصال بالوكيل: {error}",
  documentsFailed: "تعذّرت قراءة الوثائق: {error}",
  agentStopped: "توقّف الوكيل: {error}",
  reviewTitle: "مراجعة المرشد",
  reviewHint: "اعتمد كل حقل أو عدّله. كل قيمة تُظهر مصدرها.",
  noProgramme: "لم يُحدَّد برنامج",
  noPack: "لا يوجد ملف للمراجعة بعد.",
  startHere: "ابدأ من صفحة الطالب",
  needsCounsellor: "يحتاج مراجعة المرشد",
  fromInterview: "من المقابلة (الإجابة {n}): «{quote}»",
  fromDocument: "من الوثيقة: {key}",
  documentAlt: "الوثيقة: {label}",
  approve: "اعتماد",
  approved: "معتمد ✓",
  edit: "تعديل",
  missingTitle: "ما ينقص الملف",
  nothingMissing: "الملف مكتمل.",
  approvePack: "اعتماد الملف",
  packApproved: "تم اعتماد ملف التقديم من المرشد ✓",
  switchTo: "English",
};

type StringKey = keyof typeof ar;

const en: Record<StringKey, string> = {
  appTitle: "Nara Agent",
  tagline: "Speak Arabic, photograph your documents, and the agent prepares a university application pack, checking every detail before a counsellor reviews it.",
  sampleNote: "Sample data for the demo: the universities and admission rules shown here are fictional.",
  interviewTitle: "1. Voice interview",
  interviewNote: "The interview runs in Arabic, the student's language.",
  agentName: "Nara Agent",
  student: "Student",
  speak: "🎙 Speak",
  stopAndSend: "■ Stop and send",
  typePlaceholder: "Or type the answer here",
  send: "Send",
  documentsTitle: "2. Photograph the documents",
  documentsHint: "Tawjihi certificate, passport, English test result…",
  sampleDocuments: "Sample documents:",
  fieldsRead: "{n} fields read",
  agentTitle: "3. Let the agent work",
  runAgent: "Run Nara Agent",
  openReview: "Open counsellor review →",
  knownTitle: "What the agent knows",
  nothingYet: "Nothing yet.",
  name: "Name",
  nationality: "Nationality",
  tawjihiAverage: "Tawjihi average",
  stream: "Stream",
  graduationYear: "Graduation year",
  fieldOfStudy: "Field of study",
  countries: "Countries",
  englishTest: "English test",
  budget: "Budget",
  usd: "USD {n}",
  thinking: "The agent is thinking…",
  listening: "Listening to the answer…",
  readingDocuments: "Reading the documents…",
  agentWorking: "The agent is working on the application…",
  notHeard: "I didn't catch that, please try again",
  noMic: "Can't use the microphone. You can type the answer instead.",
  agentUnreachable: "Could not reach the agent: {error}",
  documentsFailed: "Could not read the documents: {error}",
  agentStopped: "The agent stopped: {error}",
  reviewTitle: "Counsellor review",
  reviewHint: "Approve or edit every field. Each value shows where it came from.",
  noProgramme: "No programme chosen",
  noPack: "No application to review yet.",
  startHere: "Start from the student page",
  needsCounsellor: "Needs counsellor review",
  fromInterview: "From the interview (answer {n}): “{quote}”",
  fromDocument: "From the document: {key}",
  documentAlt: "Document: {label}",
  approve: "Approve",
  approved: "Approved ✓",
  edit: "Edit",
  missingTitle: "Missing from the application",
  nothingMissing: "Nothing is missing.",
  approvePack: "Approve application",
  packApproved: "Application approved by the counsellor ✓",
  switchTo: "العربية",
};

export const STRINGS: Record<Lang, Record<StringKey, string>> = { ar, en };

const LABELS = {
  ar: { missing: MISSING_AR, stream: STREAM_AR, docType: DOC_TYPE_AR, confidence: CONFIDENCE_AR },
  en: { missing: MISSING_EN, stream: STREAM_EN, docType: DOC_TYPE_EN, confidence: CONFIDENCE_EN },
};

const STORAGE_KEY = "nara-agent-lang";

const LangContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({ lang: "ar", setLang: () => {} });

export function LangProvider({ children, initial }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initial ?? "ar");

  useEffect(() => {
    if (initial) return;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "ar" || saved === "en") setLangState(saved);
    } catch {
      /* storage blocked: stay in Arabic */
    }
  }, [initial]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the choice just won't be remembered */
    }
  };

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const { lang, setLang } = useContext(LangContext);
  const t = (key: StringKey, vars: Record<string, string | number> = {}) =>
    STRINGS[lang][key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
  return { lang, setLang, t, dir: lang === "ar" ? ("rtl" as const) : ("ltr" as const), labels: LABELS[lang] };
}

export function LangToggle() {
  const { lang, setLang, t } = useLang();
  return (
    <button
      type="button"
      lang={lang === "ar" ? "en" : "ar"}
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className="rounded-full border border-line px-4 py-1 text-sm font-medium text-accent"
    >
      {t("switchTo")}
    </button>
  );
}
