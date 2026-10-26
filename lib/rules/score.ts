const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EASTERN_ARABIC_INDIC = "۰۱۲۳۴۵۶۷۸۹";

/** Parses a 0-100 score written with Western or Arabic-Indic digits, "٫" or "," decimals, and an optional "%". */
export function parseScore(text: string): number {
  const normalised = [...text.trim()]
    .map((ch) => {
      const a = ARABIC_INDIC.indexOf(ch);
      if (a >= 0) return String(a);
      const e = EASTERN_ARABIC_INDIC.indexOf(ch);
      if (e >= 0) return String(e);
      if (ch === "٫" || ch === ",") return ".";
      return ch;
    })
    .join("")
    .replace(/[%٪\s]/g, "");

  const value = Number(normalised);
  if (!Number.isFinite(value) || normalised === "" || value < 0 || value > 100) {
    throw new RangeError(`Not a score between 0 and 100: "${text}"`);
  }
  return value;
}
