import { StudentFlow } from "@/components/StudentFlow";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <header>
        <h1 className="text-3xl font-bold text-accent">وكيل نارا</h1>
        <p className="mt-1 text-muted">
          تحدّث بالعربية، صوّر وثائقك، وسيجهّز الوكيل ملف تقديمك الجامعي ويتحقق من كل معلومة قبل أن يراجعه المرشد.
        </p>
        <p className="text-xs text-muted" dir="ltr">
          Nara Agent — speak Arabic, photograph your documents, and get a verified application pack for counsellor review.
        </p>
      </header>
      <StudentFlow />
    </main>
  );
}
