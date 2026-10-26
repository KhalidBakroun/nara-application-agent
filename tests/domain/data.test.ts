import { describe, expect, it } from "vitest";
import programmes from "@/data/programmes.json";
import personas from "@/data/personas.json";
import { PersonaSchema, ProgrammeSchema } from "@/lib/domain/schemas";

describe("sample programme catalogue", () => {
  it("has 12 programmes that all match the Programme schema", () => {
    expect(programmes).toHaveLength(12);
    for (const p of programmes) expect(() => ProgrammeSchema.parse(p)).not.toThrow();
  });

  it("covers the UK, Ireland, the Netherlands, Malaysia and Turkey", () => {
    const countries = new Set(programmes.map((p) => p.country));
    for (const c of ["UK", "Ireland", "Netherlands", "Malaysia", "Turkey"]) expect(countries).toContain(c);
  });

  it("marks every university as sample data", () => {
    for (const p of programmes) expect(p.university.endsWith("(sample)")).toBe(true);
  });
});

describe("sample student personas", () => {
  const byName = (n: string) => personas.find((p) => p.nameEn === n);

  it("has the three demo students with their grades and English results", () => {
    expect(personas).toHaveLength(3);
    for (const p of personas) expect(() => PersonaSchema.parse(p)).not.toThrow();

    expect(byName("Lina")).toMatchObject({ tawjihiAverage: 92.1, stream: "scientific", englishTest: { type: "IELTS", score: 6.5 } });
    expect(byName("Omar")).toMatchObject({ tawjihiAverage: 78.4, stream: "literary", englishTest: { type: "none" } });
    expect(byName("Sara")).toMatchObject({ tawjihiAverage: 85.0, stream: "it", englishTest: { type: "IELTS", score: 6.0 } });
  });
});
