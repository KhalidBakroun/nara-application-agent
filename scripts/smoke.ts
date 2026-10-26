/**
 * Live check against the Meta Model API: `npm run smoke`.
 * Loads MODEL_API_KEY from ~/.nara-secrets/meta-model-api-key.txt when the env var is not set.
 * Never prints the key.
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createMetaModelClient } from "../lib/meta/modelClient";

const keyFile = path.join(homedir(), ".nara-secrets", "meta-model-api-key.txt");
if (!process.env.MODEL_API_KEY && existsSync(keyFile)) {
  process.env.MODEL_API_KEY = readFileSync(keyFile, "utf8").trim().split(/\r?\n/)[0].trim();
}

async function main() {
  const model = createMetaModelClient();
  const turn = await model.respond({
    input: [{ role: "user", content: "Reply in one short Arabic sentence: what is Tawjihi?" }],
  });
  console.log("muse-spark-1.3 replied:", turn.text);
}

main().catch((err) => {
  console.error("Smoke test failed:", (err as Error).message);
  process.exit(1);
});
