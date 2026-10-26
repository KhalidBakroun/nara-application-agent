export const ASR_URL = "https://api.meta.ai/v1/asr/transcribe";

export const ASR_REQUEST = {
  mode: "PUSH_TO_TALK",
  model: "muse-voice-transcribe-1.0",
  audioEncoding: "WAV",
  languageBias: ["Arabic", "English"],
} as const;

/** Sends one WAV answer (mono, 16-bit, 16 kHz, ≤ 10 min) to Muse Voice Transcribe. Server-side only. */
export async function transcribe(
  wav: Blob,
  fetchImpl: typeof fetch = fetch,
): Promise<{ transcript: string; durationMs: number }> {
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new Error("MODEL_API_KEY is not set");

  const form = new FormData();
  form.set("request", new Blob([JSON.stringify(ASR_REQUEST)], { type: "application/json" }));
  form.set("audio", wav, "answer.wav");

  const res = await fetchImpl(ASR_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    body: form,
  });
  if (!res.ok) throw new Error(`ASR failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { transcript?: string; audioDurationMs?: number };
  return { transcript: body.transcript ?? "", durationMs: body.audioDurationMs ?? 0 };
}
