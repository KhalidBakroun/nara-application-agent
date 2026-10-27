/**
 * Live run of the application agent against the Meta Model API for one sample persona.
 * Usage: npx tsx scripts/live-agent.ts [lina|omar|sara]   (key from ~/.nara-secrets/meta-model-api-key.txt)
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import personas from "../data/personas.json";
import programmes from "../data/programmes.json";
import { runApplicationAgent } from "../lib/agent/applicationAgent";
import { personaProfile } from "../lib/domain/personas";
import type { Persona, Programme } from "../lib/domain/types";
import { createMetaModelClient } from "../lib/meta/modelClient";

const keyFile = path.join(homedir(), ".nara-secrets", "meta-model-api-key.txt");
if (!process.env.MODEL_API_KEY && existsSync(keyFile)) {
  process.env.MODEL_API_KEY = readFileSync(keyFile, "utf8").trim().split(/\r?\n/)[0].trim();
}

const id = process.argv[2] ?? "sara";
const p = personas.find((x) => x.id === id);
if (!p) throw new Error(`Unknown persona ${id}`);

const profile = personaProfile(p as Persona);

async function main() {
  const started = Date.now();
  const result = await runApplicationAgent(
    createMetaModelClient(),
    { profile, documents: [], programmes: programmes as Programme[] },
    (e) => console.log(`${e.step}. ${e.tool} ${JSON.stringify(e.input)} → ${e.summaryAr}`),
  );
  console.log("stopped:", result.stoppedReason, `(${((Date.now() - started) / 1000).toFixed(1)} s)`);
  console.log("programme:", result.pack.programmeId, "| fields:", result.pack.fields.length, "| missing:", result.pack.missing.join(", "));
  console.log("summary:", result.summaryAr);
}

main().catch((err) => {
  console.error("Live agent failed:", (err as Error).message);
  process.exit(1);
});
