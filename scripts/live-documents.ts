/**
 * Live document read against the Meta Model API: sam-3.1 finds the page, muse-spark-1.3 reads the fields.
 * Writes each page with its field boxes drawn on, so the boxes can be checked by eye.
 * Usage: npx tsx scripts/live-documents.ts <out-dir> <image> [image...]   (key from ~/.nara-secrets/meta-model-api-key.txt)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { readDocument } from "../lib/documents/read";

const keyFile = path.join(homedir(), ".nara-secrets", "meta-model-api-key.txt");
if (!process.env.MODEL_API_KEY && existsSync(keyFile)) {
  process.env.MODEL_API_KEY = readFileSync(keyFile, "utf8").trim().split(/\r?\n/)[0].trim();
}

const [outDir, ...images] = process.argv.slice(2);
if (!outDir || images.length === 0) throw new Error("Usage: live-documents.ts <out-dir> <image> [image...]");
mkdirSync(outDir, { recursive: true });

async function main() {
  for (const image of images) {
    const started = Date.now();
    const doc = await readDocument(readFileSync(image));
    console.log(`\n${image}: ${doc.docType}, page ${doc.width}x${doc.height}, ${((Date.now() - started) / 1000).toFixed(1)} s`);
    for (const f of doc.fields) console.log(`  ${f.key} = ${f.value}  [${f.box.join(", ")}] ${f.confidence}`);

    const page = Buffer.from(doc.cropDataUrl!.split(",")[1], "base64");
    const rects = doc.fields
      .map(({ box: [x0, y0, x1, y1] }) => `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="none" stroke="#D946EF" stroke-width="3"/>`)
      .join("");
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}">${rects}</svg>`);
    const out = path.join(outDir, `${path.basename(image, path.extname(image))}-boxes.jpg`);
    writeFileSync(out, await sharp(page).composite([{ input: svg }]).jpeg().toBuffer());
    console.log(`  boxes drawn: ${out}`);
  }
}

main().catch((err) => {
  console.error("Live document read failed:", (err as Error).message);
  process.exit(1);
});
