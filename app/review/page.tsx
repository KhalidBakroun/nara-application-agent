"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import programmes from "@/data/programmes.json";
import { ReviewBoard } from "@/components/ReviewBoard";
import { loadSession, type Session } from "@/lib/session";

export default function ReviewPage() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => setSession(loadSession()), []);

  if (session === undefined) return null;
  if (!session?.pack) {
    return (
      <main className="mx-auto max-w-3xl p-8" dir="rtl">
        <p>لا يوجد ملف للمراجعة بعد.</p>
        <Link href="/" className="text-accent underline">ابدأ من صفحة الطالب</Link>
      </main>
    );
  }

  const programme = programmes.find((p) => p.id === session.pack!.programmeId);
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <header dir="rtl">
        <h1 className="text-3xl font-bold text-accent">مراجعة المرشد</h1>
        <p className="mt-1 text-muted">
          {session.profile.fullName ?? "الطالب"} — {programme ? `${programme.nameAr}، ${programme.university}` : "لم يُحدَّد برنامج"}
        </p>
        <p className="text-xs text-muted" dir="ltr">Counsellor review: approve or edit every field. Each value shows where it came from.</p>
      </header>
      <ReviewBoard pack={session.pack} documents={session.documents} />
    </main>
  );
}
