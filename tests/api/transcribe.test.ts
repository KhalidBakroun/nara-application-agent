import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { transcribe } from "@/lib/meta/asr";

describe("transcribe", () => {
  const saved = process.env.MODEL_API_KEY;
  beforeEach(() => {
    process.env.MODEL_API_KEY = "test-key";
  });
  afterEach(() => {
    process.env.MODEL_API_KEY = saved;
  });

  it("posts the WAV to the Meta ASR endpoint with the exact request settings", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ transcript: "اسمي لينا", audioDurationMs: 2100, turns: [] }));

    const result = await transcribe(new Blob([new Uint8Array(44)], { type: "audio/wav" }), fetchImpl);

    expect(result).toEqual({ transcript: "اسمي لينا", durationMs: 2100 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.meta.ai/v1/asr/transcribe");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
    const form = init.body as FormData;
    expect(JSON.parse(await (form.get("request") as Blob).text())).toEqual({
      mode: "PUSH_TO_TALK",
      model: "muse-voice-transcribe-1.0",
      audioEncoding: "WAV",
      languageBias: ["Arabic", "English"],
    });
    expect(form.get("audio")).toBeInstanceOf(Blob);
  });

  it("raises a clear error when the ASR call fails", async () => {
    const fetchImpl = vi.fn(async () => new Response("bad audio", { status: 400 }));
    await expect(transcribe(new Blob([]), fetchImpl)).rejects.toThrow("ASR failed (400)");
  });
});

describe("POST /api/transcribe", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/meta/asr");
  });

  it("reports an empty transcript instead of failing", async () => {
    vi.doMock("@/lib/meta/asr", () => ({ transcribe: async () => ({ transcript: "  ", durationMs: 900 }) }));
    const { POST } = await import("@/app/api/transcribe/route");
    const form = new FormData();
    form.set("audio", new Blob([new Uint8Array(44)], { type: "audio/wav" }), "answer.wav");

    const res = await POST(new Request("http://localhost/api/transcribe", { method: "POST", body: form }));

    expect(await res.json()).toEqual({ transcript: "", empty: true });
  });

  it("returns 400 when no audio is attached", async () => {
    const { POST } = await import("@/app/api/transcribe/route");
    const res = await POST(new Request("http://localhost/api/transcribe", { method: "POST", body: new FormData() }));
    expect(res.status).toBe(400);
  });
});
