import type { ApplicationPack, StudentProfile, TraceEvent } from "@/lib/domain/types";
import type { ExtractedDocument } from "@/lib/documents/extract";

export interface Session {
  profile: StudentProfile;
  documents: ExtractedDocument[];
  trace: TraceEvent[];
  pack?: ApplicationPack;
  summaryAr?: string;
}

const KEY = "nara-agent-session";

/** Browser-only, best effort: storage can be blocked or full, so failures never break the page. */
export function saveSession(s: Session): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore: the review page will show an empty state */
  }
}

export function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
