/** Arabic names for missing items and confidence levels shown in the UI. */
export const MISSING_AR: Record<string, string> = {
  tawjihi_certificate: "شهادة التوجيهي",
  passport: "جواز السفر",
  english_test: "نتيجة اختبار اللغة الإنجليزية",
  personal_statement: "الرسالة الشخصية",
  motivation_letter: "رسالة الدافع",
  reference_letter: "رسالة توصية",
  portfolio: "ملف الأعمال",
  fullName: "الاسم الكامل",
  nationality: "الجنسية",
  tawjihiAverage: "معدل التوجيهي",
  stream: "الفرع الدراسي",
  graduationYear: "سنة التخرج",
};

export const STREAM_AR: Record<string, string> = { scientific: "العلمي", literary: "الأدبي", it: "المعلوماتية", other: "آخر" };

export const CONFIDENCE_AR = { high: "ثقة عالية", medium: "ثقة متوسطة", low: "ثقة منخفضة" } as const;

export const NEEDS_COUNSELLOR_AR = "يحتاج مراجعة المرشد";
