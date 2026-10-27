"use client";

import { useState } from "react";
import type { ApplicationField, ApplicationPack } from "@/lib/domain/types";
import { evidenceView } from "@/lib/documents/evidence";
import type { ExtractedDocument } from "@/lib/documents/extract";
import { useLang } from "@/lib/i18n";

interface Props {
  pack: ApplicationPack;
  documents: ExtractedDocument[];
}

function Evidence({ field, documents }: { field: ApplicationField; documents: ExtractedDocument[] }) {
  const { t, lang } = useLang();
  const source = field.source;
  if (!source) {
    return <span className="rounded-full bg-warn-soft px-3 py-1 text-sm font-medium text-warn">{t("needsCounsellor")}</span>;
  }
  if (source.kind === "interview") {
    return (
      <p className="text-sm text-muted" dir="auto">
        {t("fromInterview", { n: source.turn, quote: source.quote })}
      </p>
    );
  }
  const doc = documents.find((d) => d.documentId === source.documentId);
  if (!doc?.cropDataUrl || !doc.width || !doc.height) {
    return <p className="text-sm text-muted">{t("fromDocument", { key: source.fieldKey })}</p>;
  }
  const { window: win, highlight } = evidenceView(source.box, doc.width, doc.height);
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  return (
    <figure
      className="relative w-full max-w-md overflow-hidden rounded-lg border border-line"
      style={{ aspectRatio: `${win.width} / ${win.height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={doc.cropDataUrl}
        alt={t("documentAlt", { label: lang === "ar" ? field.labelAr : field.label })}
        className="absolute max-w-none"
        style={{ width: pct(doc.width, win.width), left: pct(-win.left, win.width), top: pct(-win.top, win.height) }}
      />
      <span
        className="absolute rounded border-2 border-accent bg-accent/10"
        style={{
          left: pct(highlight[0] - win.left, win.width),
          top: pct(highlight[1] - win.top, win.height),
          width: pct(highlight[2] - highlight[0], win.width),
          height: pct(highlight[3] - highlight[1], win.height),
        }}
      />
    </figure>
  );
}

export function ReviewBoard({ pack, documents }: Props) {
  const { t, lang, dir, labels } = useLang();
  const [fields, setFields] = useState(pack.fields);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [packApproved, setPackApproved] = useState(false);
  const allApproved = fields.length > 0 && fields.every((f) => approved[f.key]);

  return (
    <div dir={dir} lang={lang} className="space-y-6">
      <section className="space-y-4">
        {fields.map((field) => (
          <article key={field.key} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold">{lang === "ar" ? field.labelAr : field.label}</h3>
                <p className="text-xs text-muted" dir={lang === "ar" ? "ltr" : "rtl"}>
                  {lang === "ar" ? field.label : field.labelAr}
                </p>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent">{labels.confidence[field.confidence]}</span>
            </header>

            {editing === field.key ? (
              <input
                className="mt-3 w-full rounded-lg border border-line p-2"
                dir="auto"
                defaultValue={field.value}
                onBlur={(e) => {
                  const value = e.target.value;
                  setFields((all) => all.map((f) => (f.key === field.key ? { ...f, value } : f)));
                  setEditing(null);
                }}
                autoFocus
              />
            ) : (
              <p className="mt-3 text-xl font-medium" dir="auto">
                {field.value || "—"}
              </p>
            )}

            <div className="mt-3">
              <Evidence field={field} documents={documents} />
            </div>

            <footer className="mt-4 flex gap-2">
              <button
                type="button"
                className={`rounded-lg px-4 py-2 text-sm font-medium ${approved[field.key] ? "bg-ok-soft text-ok" : "bg-accent text-white"}`}
                onClick={() => setApproved((a) => ({ ...a, [field.key]: true }))}
                aria-pressed={Boolean(approved[field.key])}
              >
                {approved[field.key] ? t("approved") : t("approve")}
              </button>
              <button type="button" className="rounded-lg border border-line px-4 py-2 text-sm" onClick={() => setEditing(field.key)}>
                {t("edit")}
              </button>
            </footer>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h3 className="text-lg font-bold">{t("missingTitle")}</h3>
        {pack.missing.length === 0 ? (
          <p className="mt-2 text-ok">{t("nothingMissing")}</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 ps-5">
            {pack.missing.map((m) => (
              <li key={m}>{labels.missing[m] ?? m}</li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        className="w-full rounded-xl bg-accent py-3 text-lg font-bold text-white disabled:opacity-40"
        disabled={!allApproved}
        onClick={() => setPackApproved(true)}
      >
        {t("approvePack")}
      </button>
      {packApproved && <p className="text-center text-ok">{t("packApproved")}</p>}
    </div>
  );
}
