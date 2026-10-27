import type { ApplicationPack, Programme, StudentProfile } from "@/lib/domain/types";
import type { ExtractedDocument } from "@/lib/documents/extract";
import type { ModelClient } from "@/lib/meta/modelClient";
import { runApplicationAgent } from "./applicationAgent";

export interface ClassStudent {
  profile: StudentProfile;
  documents?: ExtractedDocument[];
}

/** One line of the class table, plus the full pack so the counsellor can open that student's review. */
export interface ClassRow {
  index: number;
  name: string;
  bestProgramme: string;
  eligible: boolean;
  viaFoundation: boolean;
  missingCount: number;
  pack: ApplicationPack;
  summaryAr?: string;
  summaryEn?: string;
  error?: string;
}

const EMPTY_PACK: ApplicationPack = { programmeId: "", fields: [], missing: [], shortlist: [] };

/**
 * Runs the application agent for every student, `concurrency` at a time. A failed run becomes a row with
 * `error` and the rest of the class carries on. Rows keep the students' order.
 */
export async function runClass(
  model: ModelClient,
  students: ClassStudent[],
  programmes: Programme[],
  opts: { concurrency?: number; onRow?: (row: ClassRow) => void } = {},
): Promise<ClassRow[]> {
  const rows: ClassRow[] = new Array(students.length);
  let next = 0;

  const worker = async () => {
    while (next < students.length) {
      const index = next++;
      const { profile, documents = [] } = students[index];
      const name = profile.fullName ?? `#${index + 1}`;
      let row: ClassRow;
      try {
        const { pack, summaryAr, summaryEn } = await runApplicationAgent(model, { profile, documents, programmes }, () => {});
        const chosen = pack.shortlist.find((s) => s.programmeId === pack.programmeId);
        row = {
          index,
          name,
          bestProgramme: pack.programmeId,
          eligible: Boolean(chosen?.eligible),
          viaFoundation: Boolean(chosen?.viaFoundation),
          missingCount: pack.missing.length,
          pack,
          summaryAr,
          summaryEn,
        };
      } catch (err) {
        row = { index, name, bestProgramme: "", eligible: false, viaFoundation: false, missingCount: 0, pack: EMPTY_PACK, error: (err as Error).message };
      }
      rows[index] = row;
      opts.onRow?.(row);
    }
  };

  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 3, students.length) }, worker));
  return rows;
}
