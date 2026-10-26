"use client";

import { useState } from "react";
import type { ApplicationField, ApplicationPack } from "@/lib/domain/types";
import type { ExtractedDocument } from "@/lib/documents/extract";
import { CONFIDENCE_AR, MISSING_AR, NEEDS_COUNSELLOR_AR } from "@/lib/labels";

interface Props {
  pack: ApplicationPack;
  documents: ExtractedDocument[];
}

function Evidence({ field, documents }: { field: ApplicationField; documents: ExtractedDocument[] }) {
  const source = field.source;
  if (!source) {
    return <span className="rounded-full bg-warn-soft px-3 py-1 text-sm font-medium text-warn">{NEEDS_COUNSELLOR_AR}</span>;
  }
  if (source.kind === "interview") {
    return <p className="text-sm text-muted">من المقابلة (الإجابة {source.turn}): «{source.quote}»</p>;
  }
  const doc = documents.find((d) => d.documentId === source.documentId);
  if (!doc?.cropDataUrl || !doc.width || !doc.height) {
    return <p className="text-sm text-muted">من الوثيقة: {source.fieldKey}</p>;
  }
  const [x0, y0, x1, y1] = source.box;
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  return (
    <figure className="relative w-full max-w-sm overflow-hidden rounded-lg border border-line">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={doc.cropDataUrl} alt={`الوثيقة: ${field.labelAr}`} className="block w-full" />
      <span
        className="absolute rounded border-2 border-accent bg-accent/10"
        style={{ left: pct(x0, doc.width), top: pct(y0, doc.height), width: pct(x1 - x0, doc.width), height: pct(y1 - y0, doc.height) }}
      />
    </figure>
  );
}

export function ReviewBoard({ pack, documents }: Props) {
  const [fields, setFields] = useState(pack.fields);
  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [packApproved, setPackApproved] = useState(false);
  const allApproved = fields.length > 0 && fields.every((f) => approved[f.key]);

  return (
    <div dir="rtl" lang="ar" className="space-y-6">
      <section className="space-y-4">
        {fields.map((field) => (
          <article key={field.key} className="rounded-xl border border-line bg-surface p-4 shadow-sm">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold">{field.labelAr}</h3>
                <p className="text-xs text-muted" dir="ltr">{field.label}</p>
              </div>
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs text-accent">{CONFIDENCE_AR[field.confidence]}</span>
            </header>

            {editing === field.key ? (
              <input
                className="mt-3 w-full rounded-lg border border-line p-2"
                defaultValue={field.value}
                onBlur={(e) => {
                  const value = e.target.value;
                  setFields((all) => all.map((f) => (f.key === field.key ? { ...f, value } : f)));
                  setEditing(null);
                }}
                autoFocus
              />
            ) : (
              <p className="mt-3 text-xl font-medium">{field.value || "—"}</p>
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
                {approved[field.key] ? "معتمد ✓" : "اعتماد"}
              </button>
              <button type="button" className="rounded-lg border border-line px-4 py-2 text-sm" onClick={() => setEditing(field.key)}>
                تعديل
              </button>
            </footer>
          </article>
        ))}
      </section>

      <section className="rounded-xl border border-line bg-surface p-4">
        <h3 className="text-lg font-bold">ما ينقص الملف</h3>
        {pack.missing.length === 0 ? (
          <p className="mt-2 text-ok">الملف مكتمل.</p>
        ) : (
          <ul className="mt-2 list-disc space-y-1 pe-5">
            {pack.missing.map((m) => (
              <li key={m}>{MISSING_AR[m] ?? m}</li>
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
        اعتماد الملف
      </button>
      {packApproved && <p className="text-center text-ok">تم اعتماد ملف التقديم من المرشد ✓</p>}
    </div>
  );
}
