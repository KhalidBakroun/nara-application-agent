import { z } from "zod";

export const StreamSchema = z.enum(["scientific", "literary", "it", "other"]);

export const BoxSchema = z.tuple([z.number(), z.number(), z.number(), z.number()]);

export const SourceRefSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("document"), documentId: z.string(), fieldKey: z.string(), box: BoxSchema }),
  z.object({ kind: z.literal("interview"), turn: z.number().int(), quote: z.string() }),
]);

export const EnglishTestSchema = z.object({
  type: z.enum(["IELTS", "TOEFL", "none"]),
  score: z.number().optional(),
});

export const StudentProfileSchema = z.object({
  fullName: z.string().optional(),
  nationality: z.string().optional(),
  tawjihiAverage: z.number().min(0).max(100).optional(),
  stream: StreamSchema.optional(),
  graduationYear: z.number().int().optional(),
  englishTest: EnglishTestSchema,
  targetCountries: z.array(z.string()),
  fieldOfStudy: z.string().optional(),
  budgetUsdPerYear: z.number().optional(),
  sources: z.record(z.string(), SourceRefSchema),
});

export const ProgrammeSchema = z.object({
  id: z.string(),
  university: z.string(),
  country: z.string(),
  name: z.string(),
  nameAr: z.string(),
  field: z.string(),
  tuitionUsdPerYear: z.number().positive(),
  minTawjihi: z.number().min(0).max(100),
  acceptedStreams: z.array(StreamSchema).min(1),
  minIelts: z.number().min(0).max(9),
  foundationAvailable: z.boolean(),
  requiredDocuments: z.array(z.string()).min(1),
});

export const PersonaSchema = z.object({
  id: z.string(),
  nameEn: z.string(),
  fullName: z.string(),
  fullNameEn: z.string(),
  nationality: z.string(),
  tawjihiAverage: z.number(),
  stream: StreamSchema,
  graduationYear: z.number().int(),
  englishTest: EnglishTestSchema,
  targetCountries: z.array(z.string()).min(1),
  fieldOfStudy: z.string(),
  budgetUsdPerYear: z.number(),
});

export const CheckSchema = z.object({
  rule: z.enum(["tawjihi", "stream", "english", "budget"]),
  passed: z.boolean(),
  detail: z.string(),
});

export const ApplicationFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  labelAr: z.string(),
  value: z.string(),
  source: SourceRefSchema.optional(),
  confidence: z.enum(["high", "medium", "low"]),
});

export const ShortlistItemSchema = z.object({
  programmeId: z.string(),
  eligible: z.boolean(),
  viaFoundation: z.boolean(),
  checks: z.array(CheckSchema),
  reasonAr: z.string(),
});

export const ApplicationPackSchema = z.object({
  programmeId: z.string(),
  fields: z.array(ApplicationFieldSchema),
  missing: z.array(z.string()),
  shortlist: z.array(ShortlistItemSchema),
});

export const TraceEventSchema = z.object({
  step: z.number().int(),
  tool: z.string(),
  input: z.unknown(),
  output: z.unknown(),
  summaryAr: z.string(),
  summaryEn: z.string().optional(),
});
