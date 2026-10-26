/** Captures one real sam-3.1 reply for a sample image into tests/fixtures (used by parser tests). */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { getMetaClient } from "../lib/meta/client";

const keyFile = path.join(homedir(), ".nara-secrets", "meta-model-api-key.txt");
if (!process.env.MODEL_API_KEY && existsSync(keyFile)) process.env.MODEL_API_KEY = readFileSync(keyFile, "utf8").trim().split(/\r?\n/)[0].trim();

const image = process.argv[2] ?? "public/samples/lina-tawjihi.jpg";
const out = process.argv[3] ?? "tests/fixtures/sam-document.txt";
const prompt = process.argv[4] ?? "document";

async function main() {
  const dataUrl = `data:image/jpeg;base64,${readFileSync(image).toString("base64")}`;
  const res = await (getMetaClient().responses.create as unknown as (b: unknown) => Promise<{ output_text?: string }>)({
    model: "sam-3.1",
    input: [{ role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: dataUrl }] }],
  });
  writeFileSync(out, res.output_text ?? "");
  console.log(`saved ${out} (${(res.output_text ?? "").length} chars)`);
  console.log((res.output_text ?? "").slice(0, 300));
}
main().catch((e) => { console.error("capture failed:", (e as Error).message); process.exit(1); });
