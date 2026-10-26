import { describe, expect, it } from "vitest";
import { parseScore } from "@/lib/rules/score";
import { convertTawjihi } from "@/lib/rules/tawjihi";
import { checkProgramme } from "@/lib/rules/requirements";
import type { Programme, StudentProfile } from "@/lib/domain/types";

const programme = (over: Partial<Programme> = {}): Programme => ({
  id: "p1",
  university: "Test University (sample)",
  country: "UK",
  name: "BSc Test",
  nameAr: "بكالوريوس تجريبي",
  field: "computer_science",
  tuitionUsdPerYear: 14000,
  minTawjihi: 80,
  acceptedStreams: ["scientific"],
  minIelts: 6.0,
  foundationAvailable: false,
  requiredDocuments: ["tawjihi_certificate"],
  ...over,
});

const student = (over: Partial<StudentProfile> = {}): StudentProfile => ({
  tawjihiAverage: 85,
  stream: "scientific",
  englishTest: { type: "IELTS", score: 6.0 },
  targetCountries: ["UK"],
  budgetUsdPerYear: 15000,
  sources: {},
  ...over,
});

describe("parseScore", () => {
  it("reads Arabic-Indic digits with the Arabic decimal mark", () => {
    expect(parseScore("٨٥٫٤")).toBe(85.4);
  });

  it("reads a comma decimal and a percent sign", () => {
    expect(parseScore("85,4%")).toBe(85.4);
  });

  it("rejects a score above 100", () => {
    expect(() => parseScore("120")).toThrow(RangeError);
  });
});

describe("convertTawjihi (sample rules)", () => {
  it("puts 92.1 in band A", () => {
    expect(convertTawjihi(92.1).band).toBe("A");
  });

  it("puts 78.4 in band C with a foundation year recommended", () => {
    expect(convertTawjihi(78.4)).toMatchObject({ band: "C", directEntry: false, foundationRecommended: true });
  });
});

describe("checkProgramme", () => {
  it("passes all four checks for a student who meets every requirement", () => {
    const item = checkProgramme(student(), programme());
    expect(item.eligible).toBe(true);
    expect(item.checks).toHaveLength(4);
    expect(item.checks.every((c) => c.passed)).toBe(true);
  });

  it("fails the English check when IELTS is below the minimum", () => {
    const item = checkProgramme(student(), programme({ minIelts: 6.5 }));
    expect(item.eligible).toBe(false);
    const english = item.checks.find((c) => c.rule === "english");
    expect(english?.passed).toBe(false);
    expect(english?.detail).toContain("6.5");
  });

  it("asks for IELTS when the student has no English test", () => {
    const item = checkProgramme(student({ englishTest: { type: "none" } }), programme());
    expect(item.checks.find((c) => c.rule === "english")).toMatchObject({ passed: false, detail: "IELTS needed: 6.0" });
  });

  it("keeps a programme with a foundation route for a 78.4 student with no English test", () => {
    const item = checkProgramme(
      student({ tawjihiAverage: 78.4, englishTest: { type: "none" } }),
      programme({ foundationAvailable: true }),
    );
    expect(item.eligible).toBe(false);
    expect(item.viaFoundation).toBe(true);
    expect(item.reasonAr.length).toBeGreaterThan(0);
  });

  it("fails the Tawjihi check instead of crashing when the average is unknown", () => {
    const item = checkProgramme(student({ tawjihiAverage: undefined }), programme());
    expect(item.checks.find((c) => c.rule === "tawjihi")?.passed).toBe(false);
  });
});
