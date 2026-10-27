"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import programmes from "@/data/programmes.json";
import { AppHeader } from "@/components/AppHeader";
import { ReviewBoard } from "@/components/ReviewBoard";
import { useLang } from "@/lib/i18n";
import { loadSession, type Session } from "@/lib/session";

export default function ReviewPage() {
  const { t, lang } = useLang();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => setSession(loadSession()), []);

  if (session === undefined) return null;
  if (!session?.pack) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-8">
        <AppHeader title={t("reviewTitle")} subtitle={t("noPack")} />
        <Link href="/" className="text-accent underline">
          {t("startHere")}
        </Link>
      </main>
    );
  }

  const programme = programmes.find((p) => p.id === session.pack!.programmeId);
  const programmeName = programme
    ? `${lang === "ar" ? programme.nameAr : programme.name}${lang === "ar" ? "، " : ", "}${programme.university}`
    : t("noProgramme");
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <AppHeader title={t("reviewTitle")} subtitle={`${session.profile.fullName ?? t("student")} — ${programmeName}`} />
      <p className="text-sm text-muted">{t("reviewHint")}</p>
      <ReviewBoard pack={session.pack} documents={session.documents} />
    </main>
  );
}
