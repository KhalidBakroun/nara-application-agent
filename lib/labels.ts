/** Arabic and English names for missing items, streams, document types and confidence levels shown in the UI. */
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

export const MISSING_EN: Record<string, string> = {
  tawjihi_certificate: "Tawjihi certificate",
  passport: "Passport",
  english_test: "English test result",
  personal_statement: "Personal statement",
  motivation_letter: "Motivation letter",
  reference_letter: "Reference letter",
  portfolio: "Portfolio",
  fullName: "Full name",
  nationality: "Nationality",
  tawjihiAverage: "Tawjihi average",
  stream: "Stream",
  graduationYear: "Graduation year",
};

export const STREAM_AR: Record<string, string> = { scientific: "العلمي", literary: "الأدبي", it: "المعلوماتية", other: "آخر" };
export const STREAM_EN: Record<string, string> = { scientific: "Scientific", literary: "Literary", it: "IT", other: "Other" };

export const DOC_TYPE_AR: Record<string, string> = {
  tawjihi_certificate: "شهادة التوجيهي",
  passport: "جواز السفر",
  english_test: "نتيجة اختبار اللغة",
  other: "وثيقة أخرى",
};
export const DOC_TYPE_EN: Record<string, string> = {
  tawjihi_certificate: "Tawjihi certificate",
  passport: "Passport",
  english_test: "English test result",
  other: "Other document",
};

export const CONFIDENCE_AR = { high: "ثقة عالية", medium: "ثقة متوسطة", low: "ثقة منخفضة" } as const;
export const CONFIDENCE_EN = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" } as const;
