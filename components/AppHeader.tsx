"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LangToggle, useLang } from "@/lib/i18n";

export function AppHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { t } = useLang();
  const path = usePathname();
  const nav = [
    { href: "/", label: t("navStudent") },
    { href: "/class", label: t("navClass") },
  ];
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-3xl font-bold text-accent">{title ?? t("appTitle")}</h1>
        <p className="mt-1 text-muted">{subtitle ?? t("tagline")}</p>
      </div>
      <nav className="flex shrink-0 items-center gap-2 text-sm">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3 py-1 ${path === item.href ? "bg-accent-soft font-bold text-accent" : "text-muted hover:text-accent"}`}
          >
            {item.label}
          </Link>
        ))}
        <LangToggle />
      </nav>
    </header>
  );
}
