import type { ApplicationField, Programme, SourceRef, StudentProfile } from "@/lib/domain/types";
import type { ExtractedDocument } from "@/lib/documents/extract";
import type { ToolDef } from "@/lib/meta/modelClient";
import { checkProgramme } from "@/lib/rules/requirements";
import { parseScore } from "@/lib/rules/score";
import { convertTawjihi } from "@/lib/rules/tawjihi";

export interface AgentContext {
  profile: StudentProfile;
  documents: ExtractedDocument[];
  programmes: Programme[];
}

export interface Tool {
  def: ToolDef;
  run: (args: Record<string, unknown>) => unknown;
}

export type ToolName = "convert_tawjihi" | "search_programmes" | "check_requirements" | "fill_application" | "flag_missing";

const fn = (name: ToolName, description: string, properties: Record<string, unknown>, required: string[]): ToolDef => ({
  type: "function",
  name,
  description,
  parameters: { type: "object", properties, required, additionalProperties: false },
});

/** Profile field → document field keys that can prove it, in order of preference. */
const DOCUMENT_KEYS: Record<string, string[]> = {
  fullName: ["full_name", "name"],
  nationality: ["nationality"],
  tawjihiAverage: ["average"],
  stream: ["stream"],
  graduationYear: ["graduation_year"],
  englishTest: ["overall_band"],
};

const FIELD_LABELS: Record<string, [string, string]> = {
  fullName: ["Full name", "الاسم الكامل"],
  nationality: ["Nationality", "الجنسية"],
  tawjihiAverage: ["Tawjihi average", "معدل التوجيهي"],
  stream: ["Stream", "الفرع"],
  graduationYear: ["Graduation year", "سنة التخرج"],
  englishTest: ["English test", "اختبار اللغة الإنجليزية"],
  fieldOfStudy: ["Field of study", "التخصص"],
  programme: ["Programme applied for", "البرنامج المطلوب"],
};

const REQUIRED_PROFILE_FIELDS = ["fullName", "nationality", "tawjihiAverage", "stream", "graduationYear"] as const;

function profileValue(p: StudentProfile, key: string): string | undefined {
  if (key === "englishTest") {
    if (p.englishTest.type === "none") return undefined;
    return `${p.englishTest.type}${p.englishTest.score !== undefined ? ` ${p.englishTest.score.toFixed(1)}` : ""}`;
  }
  const v = p[key as keyof StudentProfile];
  return v === undefined || v === null ? undefined : String(v);
}

function fromDocuments(docs: ExtractedDocument[], key: string) {
  for (const wanted of DOCUMENT_KEYS[key] ?? []) {
    for (const doc of docs) {
      const field = doc.fields.find((f) => f.key === wanted);
      if (field) return { doc, field };
    }
  }
  return undefined;
}

export function createTools(ctx: AgentContext): Record<ToolName, Tool> {
  const findProgramme = (args: Record<string, unknown>) => ctx.programmes.find((p) => p.id === args.programmeId);
  const unknown = (args: Record<string, unknown>) => ({ error: `Unknown programme: ${String(args.programmeId)}` });

  return {
    convert_tawjihi: {
      def: fn("convert_tawjihi", "Convert a Tawjihi average (0-100) into a sample entry band.", { avg: { type: "number" } }, ["avg"]),
      run: (args) => convertTawjihi(Number(args.avg)),
    },

    search_programmes: {
      def: fn(
        "search_programmes",
        "Search the sample programme catalogue. Returns programme ids with tuition and minimum Tawjihi.",
        {
          field: { type: "string", description: "e.g. computer_science, business, engineering" },
          countries: { type: "array", items: { type: "string" } },
          maxTuition: { type: "number", description: "USD per year" },
        },
        [],
      ),
      run: (args) => {
        const countries = Array.isArray(args.countries) ? (args.countries as string[]) : [];
        return ctx.programmes
          .filter((p) => !args.field || p.field === args.field)
          .filter((p) => countries.length === 0 || countries.includes(p.country))
          .filter((p) => typeof args.maxTuition !== "number" || p.tuitionUsdPerYear <= args.maxTuition)
          .map(({ id, university, country, name, tuitionUsdPerYear, minTawjihi, foundationAvailable }) => ({
            id, university, country, name, tuitionUsdPerYear, minTawjihi, foundationAvailable,
          }));
      },
    },

    check_requirements: {
      def: fn("check_requirements", "Check the student against one programme's entry requirements.", { programmeId: { type: "string" } }, ["programmeId"]),
      run: (args) => {
        const prog = findProgramme(args);
        return prog ? checkProgramme(ctx.profile, prog) : unknown(args);
      },
    },

    fill_application: {
      def: fn(
        "fill_application",
        "Fill the application form for one programme. Every value carries its source (document crop or interview quote).",
        { programmeId: { type: "string" } },
        ["programmeId"],
      ),
      run: (args) => {
        const prog = findProgramme(args);
        if (!prog) return unknown(args);
        const fields: ApplicationField[] = Object.keys(DOCUMENT_KEYS)
          .concat("fieldOfStudy")
          .map((key) => {
            const [label, labelAr] = FIELD_LABELS[key];
            const evidence = fromDocuments(ctx.documents, key);
            if (evidence) {
              let value = evidence.field.value;
              if (key === "tawjihiAverage") {
                try { value = String(parseScore(value)); } catch { /* keep the text as read */ }
              }
              const source: SourceRef = { kind: "document", documentId: evidence.doc.documentId, fieldKey: evidence.field.key, box: evidence.field.box };
              return { key, label, labelAr, value, source, confidence: evidence.field.confidence };
            }
            const value = profileValue(ctx.profile, key) ?? "";
            const source = ctx.profile.sources[key];
            return { key, label, labelAr, value, ...(source ? { source } : {}), confidence: source ? "medium" : "low" } as ApplicationField;
          });
        const [label, labelAr] = FIELD_LABELS.programme;
        fields.push({ key: "programme", label, labelAr, value: `${prog.name}, ${prog.university}`, confidence: "medium" });
        return fields;
      },
    },

    flag_missing: {
      def: fn("flag_missing", "List required documents not uploaded and required details still unknown.", { programmeId: { type: "string" } }, ["programmeId"]),
      run: (args) => {
        const prog = findProgramme(args);
        if (!prog) return unknown(args);
        const uploaded = new Set<string>(ctx.documents.map((d) => d.docType));
        const missingDocs = prog.requiredDocuments.filter((d) => !uploaded.has(d));
        const missingFields = REQUIRED_PROFILE_FIELDS.filter((f) => profileValue(ctx.profile, f) === undefined && !fromDocuments(ctx.documents, f));
        return [...missingDocs, ...missingFields];
      },
    },
  };
}
