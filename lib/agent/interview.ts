import type { StudentProfile, Stream } from "@/lib/domain/types";
import type { ModelClient } from "@/lib/meta/modelClient";
import { parseScore } from "@/lib/rules/score";

export interface InterviewMessage {
  role: "agent" | "student";
  text: string;
}

export interface InterviewTurn {
  profile: StudentProfile;
  nextQuestionAr: string;
  done: boolean;
}

const RETRY_AR = "عذراً، هل يمكنك إعادة ذلك؟";

const INSTRUCTIONS = `You are Nara Agent, a warm study-abroad counsellor interviewing an Arab high-school student in Arabic.
Goal: learn their full name, nationality, Tawjihi average, stream (scientific, literary, it, other), graduation year,
English test (IELTS, TOEFL or none, with score), target countries, field of study and yearly budget in USD.
From the student's LAST answer, extract only facts they actually said into "update" (null for anything not said).
Keep numbers exactly as spoken (Arabic-Indic digits are fine). Then ask ONE short, friendly next question in Arabic
about what is still missing. Never invent facts.`;

const nullable = (type: string) => ({ type: [type, "null"] });

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["update", "nextQuestionAr"],
  properties: {
    nextQuestionAr: { type: "string" },
    update: {
      type: "object",
      additionalProperties: false,
      required: [
        "fullName", "nationality", "tawjihiAverage", "stream", "graduationYear",
        "englishTestType", "englishScore", "targetCountries", "fieldOfStudy", "budgetUsdPerYear",
      ],
      properties: {
        fullName: nullable("string"),
        nationality: nullable("string"),
        tawjihiAverage: nullable("string"),
        stream: { type: ["string", "null"], enum: ["scientific", "literary", "it", "other", null] },
        graduationYear: nullable("integer"),
        englishTestType: { type: ["string", "null"], enum: ["IELTS", "TOEFL", "none", null] },
        englishScore: nullable("number"),
        targetCountries: { type: ["array", "null"], items: { type: "string" } },
        fieldOfStudy: nullable("string"),
        budgetUsdPerYear: nullable("number"),
      },
    },
  },
};

interface RawUpdate {
  fullName?: string | null;
  nationality?: string | null;
  tawjihiAverage?: string | number | null;
  stream?: Stream | null;
  graduationYear?: number | null;
  englishTestType?: "IELTS" | "TOEFL" | "none" | null;
  englishScore?: number | null;
  targetCountries?: string[] | null;
  fieldOfStudy?: string | null;
  budgetUsdPerYear?: number | null;
}

export function isInterviewComplete(p: StudentProfile): boolean {
  return Boolean(
    p.fullName && p.tawjihiAverage !== undefined && p.stream && p.fieldOfStudy && p.englishTest?.type && p.targetCountries.length > 0,
  );
}

function applyUpdate(profile: StudentProfile, u: RawUpdate, turn: number, quote: string): StudentProfile {
  const next: StudentProfile = { ...profile, sources: { ...profile.sources } };
  const cite = (field: keyof StudentProfile) => {
    next.sources[field] = { kind: "interview", turn, quote };
  };

  if (u.fullName) { next.fullName = u.fullName; cite("fullName"); }
  if (u.nationality) { next.nationality = u.nationality; cite("nationality"); }
  if (u.tawjihiAverage !== null && u.tawjihiAverage !== undefined) {
    try {
      next.tawjihiAverage = parseScore(String(u.tawjihiAverage));
      cite("tawjihiAverage");
    } catch {
      /* an unreadable score stays unknown; the agent will ask again */
    }
  }
  if (u.stream) { next.stream = u.stream; cite("stream"); }
  if (u.graduationYear) { next.graduationYear = u.graduationYear; cite("graduationYear"); }
  if (u.englishTestType) {
    next.englishTest = { type: u.englishTestType, ...(u.englishScore != null ? { score: u.englishScore } : {}) };
    cite("englishTest");
  }
  if (u.targetCountries?.length) { next.targetCountries = u.targetCountries; cite("targetCountries"); }
  if (u.fieldOfStudy) { next.fieldOfStudy = u.fieldOfStudy; cite("fieldOfStudy"); }
  if (u.budgetUsdPerYear != null) { next.budgetUsdPerYear = u.budgetUsdPerYear; cite("budgetUsdPerYear"); }
  return next;
}

export async function nextInterviewTurn(
  model: ModelClient,
  history: InterviewMessage[],
  profile: StudentProfile,
): Promise<InterviewTurn> {
  const studentTurns = history.filter((m) => m.role === "student");
  const lastAnswer = studentTurns.at(-1)?.text ?? "";

  const reply = await model.respond({
    instructions: INSTRUCTIONS,
    input: [
      { role: "user", content: `Known so far: ${JSON.stringify({ ...profile, sources: undefined })}` },
      ...history.map((m) => ({ role: m.role === "agent" ? "assistant" : "user", content: m.text })),
    ],
    jsonSchema: { name: "interview_turn", schema: SCHEMA },
  });

  let parsed: { update?: RawUpdate; nextQuestionAr?: string };
  try {
    parsed = JSON.parse(reply.text ?? "");
  } catch {
    return { profile, nextQuestionAr: RETRY_AR, done: false };
  }

  const updated = applyUpdate(profile, parsed.update ?? {}, studentTurns.length, lastAnswer);
  return { profile: updated, nextQuestionAr: parsed.nextQuestionAr || RETRY_AR, done: isInterviewComplete(updated) };
}
