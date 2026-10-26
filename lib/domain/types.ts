import type { z } from "zod";
import type {
  ApplicationFieldSchema,
  ApplicationPackSchema,
  CheckSchema,
  PersonaSchema,
  ProgrammeSchema,
  ShortlistItemSchema,
  SourceRefSchema,
  StreamSchema,
  StudentProfileSchema,
  TraceEventSchema,
} from "./schemas";

export type Stream = z.infer<typeof StreamSchema>;
export type SourceRef = z.infer<typeof SourceRefSchema>;
export type StudentProfile = z.infer<typeof StudentProfileSchema>;
export type Programme = z.infer<typeof ProgrammeSchema>;
export type Persona = z.infer<typeof PersonaSchema>;
export type Check = z.infer<typeof CheckSchema>;
export type ApplicationField = z.infer<typeof ApplicationFieldSchema>;
export type ShortlistItem = z.infer<typeof ShortlistItemSchema>;
export type ApplicationPack = z.infer<typeof ApplicationPackSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;
