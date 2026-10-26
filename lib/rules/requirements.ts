import type { Check, Programme, ShortlistItem, StudentProfile } from "@/lib/domain/types";

/** Rough TOEFL iBT → IELTS equivalence for the sample rules. */
function toIelts(test: StudentProfile["englishTest"]): number | undefined {
  if (test.type === "IELTS") return test.score;
  if (test.type === "TOEFL" && test.score !== undefined) {
    const s = test.score;
    return s >= 94 ? 7.0 : s >= 79 ? 6.5 : s >= 60 ? 6.0 : s >= 46 ? 5.5 : 5.0;
  }
  return undefined;
}

function tawjihiCheck(p: StudentProfile, prog: Programme): Check {
  if (p.tawjihiAverage === undefined) return { rule: "tawjihi", passed: false, detail: "Tawjihi average missing" };
  const passed = p.tawjihiAverage >= prog.minTawjihi;
  return { rule: "tawjihi", passed, detail: `Tawjihi ${p.tawjihiAverage} ${passed ? "≥" : "<"} ${prog.minTawjihi}` };
}

function streamCheck(p: StudentProfile, prog: Programme): Check {
  if (!p.stream) return { rule: "stream", passed: false, detail: "Stream missing" };
  const passed = prog.acceptedStreams.includes(p.stream);
  return { rule: "stream", passed, detail: passed ? `Stream ${p.stream} accepted` : `Stream ${p.stream} not accepted` };
}

function englishCheck(p: StudentProfile, prog: Programme): Check {
  const needed = prog.minIelts.toFixed(1);
  const ielts = toIelts(p.englishTest);
  if (ielts === undefined) return { rule: "english", passed: false, detail: `IELTS needed: ${needed}` };
  const passed = ielts >= prog.minIelts;
  return { rule: "english", passed, detail: `IELTS ${ielts.toFixed(1)} ${passed ? "≥" : "<"} ${needed}` };
}

function budgetCheck(p: StudentProfile, prog: Programme): Check {
  if (p.budgetUsdPerYear === undefined) return { rule: "budget", passed: true, detail: "No budget given" };
  const passed = prog.tuitionUsdPerYear <= p.budgetUsdPerYear;
  return { rule: "budget", passed, detail: `Tuition $${prog.tuitionUsdPerYear} ${passed ? "≤" : ">"} budget $${p.budgetUsdPerYear}` };
}

const FAILED_AR: Record<Check["rule"], string> = {
  tawjihi: "معدل التوجيهي أقل من المطلوب",
  stream: "الفرع الدراسي غير مقبول في هذا البرنامج",
  english: "يحتاج إلى نتيجة IELTS أعلى أو اختبار لغة",
  budget: "الرسوم أعلى من الميزانية",
};

export function checkProgramme(p: StudentProfile, prog: Programme): ShortlistItem {
  const checks = [tawjihiCheck(p, prog), streamCheck(p, prog), englishCheck(p, prog), budgetCheck(p, prog)];
  const passed = (rule: Check["rule"]) => checks.find((c) => c.rule === rule)!.passed;
  const eligible = checks.every((c) => c.passed);
  const viaFoundation =
    !eligible && prog.foundationAvailable && passed("stream") && passed("budget") && p.tawjihiAverage !== undefined;

  let reasonAr: string;
  if (eligible) {
    reasonAr = `مؤهّل للقبول المباشر: معدلك ${p.tawjihiAverage} يتجاوز الحد الأدنى ${prog.minTawjihi}، ومستوى الإنجليزية مستوفى، والرسوم ${prog.tuitionUsdPerYear} دولار سنوياً ضمن ميزانيتك.`;
  } else {
    const gaps = checks.filter((c) => !c.passed).map((c) => FAILED_AR[c.rule]).join("، ");
    reasonAr = viaFoundation
      ? `مؤهّل عبر السنة التأسيسية: ${gaps}، لكن الجامعة تقدّم سنة تأسيسية تغطي ذلك.`
      : `غير مؤهّل حالياً: ${gaps}.`;
  }

  return { programmeId: prog.id, eligible, viaFoundation, checks, reasonAr };
}
