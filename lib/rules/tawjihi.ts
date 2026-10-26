export type TawjihiBand = "A" | "B" | "C" | "D";

export interface TawjihiConversion {
  band: TawjihiBand;
  directEntry: boolean;
  foundationRecommended: boolean;
  noteAr: string;
}

const NOTES: Record<TawjihiBand, string> = {
  A: "معدل ممتاز: قبول مباشر حتى في البرامج التنافسية.",
  B: "معدل جيد جداً: قبول مباشر في معظم البرامج.",
  C: "يُنصح بسنة تأسيسية قبل البكالوريوس.",
  D: "السنة التأسيسية مطلوبة قبل البكالوريوس.",
};

/** Sample rules for the demo: A ≥ 90, B ≥ 80, C ≥ 70, D < 70; direct entry from 80. */
export function convertTawjihi(avg: number): TawjihiConversion {
  if (!Number.isFinite(avg) || avg < 0 || avg > 100) throw new RangeError(`Tawjihi average out of range: ${avg}`);
  const band: TawjihiBand = avg >= 90 ? "A" : avg >= 80 ? "B" : avg >= 70 ? "C" : "D";
  const directEntry = avg >= 80;
  return { band, directEntry, foundationRecommended: !directEntry, noteAr: NOTES[band] };
}
