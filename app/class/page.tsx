"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import personas from "@/data/personas.json";
import programmes from "@/data/programmes.json";
import { AppHeader } from "@/components/AppHeader";
import type { ClassRow } from "@/lib/agent/classRun";
import { personaProfile } from "@/lib/domain/personas";
import type { Persona, StudentProfile } from "@/lib/domain/types";
import { useLang } from "@/lib/i18n";
import { saveSession } from "@/lib/session";
import { readServerEvents } from "@/lib/sse";

export default function ClassPage() {
  const { t, lang } = useLang();
  const router = useRouter();
  const [students, setStudents] = useState<{ profile: StudentProfile }[]>([]);
  const [rows, setRows] = useState<Record<number, ClassRow>>({});
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function loadSampleClass() {
    setStudents((personas as Persona[]).map((p) => ({ profile: personaProfile(p) })));
    setRows({});
    setNotice(null);
  }

  async function runClass() {
    setRunning(true);
    setRows({});
    setNotice(null);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Class run failed");
      await readServerEvents(res, (event, payload) => {
        if (event === "row") {
          const row = payload as ClassRow;
          setRows((all) => ({ ...all, [row.index]: row }));
        } else if (event === "error") {
          setNotice(t("agentStopped", { error: (payload as { message: string }).message }));
        }
      });
    } catch (err) {
      setNotice(t("agentStopped", { error: (err as Error).message }));
    } finally {
      setRunning(false);
    }
  }

  function openReview(row: ClassRow) {
    saveSession({ profile: students[row.index].profile, documents: [], trace: [], pack: row.pack, summaryAr: row.summaryAr, summaryEn: row.summaryEn });
    router.push("/review");
  }

  const programmeName = (id: string) => {
    const p = programmes.find((x) => x.id === id);
    return p ? `${lang === "ar" ? p.nameAr : p.name} — ${p.university}` : "—";
  };
  const entry = (row: ClassRow) => (row.eligible ? t("entryDirect") : row.viaFoundation ? t("entryFoundation") : t("entryNone"));
  const finished = Object.keys(rows).length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <AppHeader title={t("classTitle")} subtitle={t("classTagline")} />

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={loadSampleClass} disabled={running} className="rounded-xl border border-accent px-5 py-3 font-bold text-accent disabled:opacity-40">
          {t("loadSampleClass", { n: personas.length })}
        </button>
        <button
          type="button"
          onClick={runClass}
          disabled={running || students.length === 0}
          className="rounded-xl bg-accent px-5 py-3 font-bold text-white disabled:opacity-40"
        >
          {t("runClass")}
        </button>
        {(running || finished > 0) && <span className="text-sm text-muted">{t("classProgress", { done: finished, total: students.length })}</span>}
      </div>

      {students.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-accent-soft text-start">
              <tr>
                <th className="p-3 text-start">{t("colStudent")}</th>
                <th className="p-3 text-start">{t("colProgramme")}</th>
                <th className="p-3 text-start">{t("colEntry")}</th>
                <th className="p-3 text-start">{t("colMissing")}</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const row = rows[i];
                return (
                  <tr key={i} className="border-t border-line">
                    <td className="p-3 font-medium" dir="auto">
                      {s.profile.fullName}
                    </td>
                    {!row ? (
                      <td className="p-3 text-muted" colSpan={4}>
                        {running ? t("waiting") : "—"}
                      </td>
                    ) : row.error ? (
                      <td className="p-3 text-warn" colSpan={4}>
                        {t("rowFailed", { error: row.error })}
                      </td>
                    ) : (
                      <>
                        <td className="p-3">{programmeName(row.bestProgramme)}</td>
                        <td className="p-3">{entry(row)}</td>
                        <td className="p-3">{row.missingCount}</td>
                        <td className="p-3 text-end">
                          <button type="button" onClick={() => openReview(row)} className="rounded-lg bg-ok px-3 py-1 font-bold text-white">
                            {t("reviewRow")}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {notice && <p className="rounded-xl bg-warn-soft p-3 text-warn">{notice}</p>}
      <p className="text-xs text-muted">{t("sampleNote")}</p>
    </main>
  );
}
