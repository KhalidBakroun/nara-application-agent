// Renders synthetic certificate "photos" for the demo personas into public/samples/.
// Every image is watermarked "SAMPLE: DEMO DATA" and uses no real logos, seals or authority names.
// Run: node scripts/make-samples.mjs
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const personas = JSON.parse(readFileSync(path.join(root, "data/personas.json"), "utf8"));
const outDir = path.join(root, "public/samples");
mkdirSync(outDir, { recursive: true });

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

const toArabicDigits = (value) =>
  String(value).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]).replace(".", "٫");

const SUBJECTS = {
  scientific: ["الرياضيات", "الفيزياء", "الكيمياء", "الأحياء", "اللغة العربية", "اللغة الإنجليزية"],
  literary: ["اللغة العربية", "اللغة الإنجليزية", "التاريخ", "الجغرافيا", "الثقافة الإسلامية", "الرياضيات"],
  it: ["الرياضيات", "علوم الحاسوب", "الشبكات", "البرمجة", "اللغة العربية", "اللغة الإنجليزية"],
};
const STREAM_AR = { scientific: "العلمي", literary: "الأدبي", it: "المعلوماتية", other: "آخر" };
// Offsets sum to zero, so the subject marks average exactly to the persona's Tawjihi average.
const OFFSETS = [3, -2, 1, -4, 2, 0];

const frame = (inner, tilt) => `<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; width: 1400px; height: 1000px; display: flex; align-items: center; justify-content: center;
         background: radial-gradient(circle at 30% 20%, #b08a5a, #7a5a35 70%); font-family: "Segoe UI", Tahoma, Arial, sans-serif; }
  .paper { position: relative; width: 1000px; padding: 48px 56px; background: #fbfaf6; color: #1d2a2e;
           transform: rotate(${tilt}deg); box-shadow: 0 18px 40px rgba(0,0,0,.45); border: 1px solid #d8d2c4; }
  .mark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none;
          font-size: 76px; font-weight: 800; color: rgba(200, 30, 60, .16); transform: rotate(-24deg); letter-spacing: 4px; }
  h1 { margin: 0 0 4px; font-size: 30px; } h2 { margin: 0 0 24px; font-size: 18px; color: #4b5b60; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 20px; }
  td, th { border: 1px solid #c9c2b2; padding: 8px 12px; text-align: right; } th { background: #ece6d8; }
  .row { display: flex; justify-content: space-between; font-size: 20px; margin: 6px 0; }
  .avg { font-size: 26px; font-weight: 700; margin-top: 18px; }
</style></head><body><div class="paper">${inner}<div class="mark">SAMPLE: DEMO DATA</div></div></body></html>`;

function tawjihiHtml(p) {
  const marks = SUBJECTS[p.stream].map((s, i) => [s, Math.round((p.tawjihiAverage + OFFSETS[i]) * 10) / 10]);
  return frame(
    `<div dir="rtl">
      <h1>شهادة الدراسة الثانوية العامة (نموذج تجريبي)</h1>
      <h2>Sample secondary certificate — for demonstration only, not an official document</h2>
      <div class="row"><span>اسم الطالب: ${p.fullName}</span><span>Name: ${p.fullNameEn}</span></div>
      <div class="row"><span>الجنسية: أردنية</span><span>الفرع: ${STREAM_AR[p.stream]}</span></div>
      <div class="row"><span>سنة التخرج: ${toArabicDigits(p.graduationYear)}</span><span>رقم الشهادة: DEMO-${p.id.toUpperCase()}-${p.graduationYear}</span></div>
      <table><tr><th>المادة</th><th>العلامة (من ١٠٠)</th></tr>
        ${marks.map(([s, m]) => `<tr><td>${s}</td><td>${toArabicDigits(m)}</td></tr>`).join("")}
      </table>
      <div class="avg">المعدل العام: ${toArabicDigits(p.tawjihiAverage.toFixed(1))}</div>
    </div>`,
    -3,
  );
}

function englishHtml(p) {
  const band = p.englishTest.score;
  const parts = [["Listening", band + 0.5], ["Reading", band], ["Writing", band - 0.5], ["Speaking", band]];
  return frame(
    `<div dir="ltr" style="text-align:left">
      <h1>English Language Test Report (sample)</h1>
      <h2>IELTS-style band scores — for demonstration only, not an official test report</h2>
      <div class="row"><span>Candidate: ${p.fullNameEn}</span><span>Nationality: Jordanian</span></div>
      <div class="row"><span>Test date: 2026-05-16</span><span>Report no.: DEMO-EN-${p.id.toUpperCase()}</span></div>
      <table><tr><th style="text-align:left">Skill</th><th style="text-align:left">Band</th></tr>
        ${parts.map(([s, b]) => `<tr><td style="text-align:left">${s}</td><td style="text-align:left">${b.toFixed(1)}</td></tr>`).join("")}
      </table>
      <div class="avg">Overall band: ${band.toFixed(1)}</div>
    </div>`,
    2,
  );
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000 });

async function render(html, file) {
  await page.setContent(html, { waitUntil: "load" });
  await page.screenshot({ path: path.join(outDir, file), type: "jpeg", quality: 85 });
  console.log("wrote", file);
}

for (const p of personas) {
  await render(tawjihiHtml(p), `${p.id}-tawjihi.jpg`);
  if (p.englishTest.type !== "none") await render(englishHtml(p), `${p.id}-english.jpg`);
}
await browser.close();
