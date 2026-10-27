"use client";

import { LangToggle, useLang } from "@/lib/i18n";

export function AppHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { t } = useLang();
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-bold text-accent">{title ?? t("appTitle")}</h1>
        <p className="mt-1 text-muted">{subtitle ?? t("tagline")}</p>
      </div>
      <div className="shrink-0">
        <LangToggle />
      </div>
    </header>
  );
}
