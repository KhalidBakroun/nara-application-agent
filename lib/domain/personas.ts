import type { Persona, StudentProfile } from "./types";

/** A sample persona as the profile the interview would have produced. */
export function personaProfile(p: Persona): StudentProfile {
  return {
    fullName: p.fullName,
    nationality: p.nationality,
    tawjihiAverage: p.tawjihiAverage,
    stream: p.stream,
    graduationYear: p.graduationYear,
    englishTest: p.englishTest,
    targetCountries: p.targetCountries,
    fieldOfStudy: p.fieldOfStudy,
    budgetUsdPerYear: p.budgetUsdPerYear,
    sources: {},
  };
}
