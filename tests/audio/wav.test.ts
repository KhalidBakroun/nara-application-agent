import { describe, expect, it } from "vitest";
import { encodeWav } from "@/lib/audio/wav";

const ascii = (bytes: Uint8Array, start: number, len: number) => String.fromCharCode(...bytes.slice(start, start + len));

describe("encodeWav", () => {
  const oneSecondAt48k = new Float32Array(48000).map((_, i) => Math.sin(i / 10) * 0.5);
  const wav = encodeWav(oneSecondAt48k, 48000);
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);

  it("writes a RIFF/WAVE header", () => {
    expect(ascii(wav, 0, 4)).toBe("RIFF");
    expect(ascii(wav, 8, 4)).toBe("WAVE");
  });

  it("is mono 16-bit PCM at 16 kHz, as the Meta ASR requires", () => {
    expect(view.getUint16(22, true)).toBe(1); // channels
    expect(view.getUint32(24, true)).toBe(16000); // sample rate
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
  });

  it("resamples one second of 48 kHz audio to 16000 samples (32000 data bytes)", () => {
    expect(ascii(wav, 36, 4)).toBe("data");
    expect(view.getUint32(40, true)).toBe(32000);
    expect(wav.byteLength).toBe(44 + 32000);
  });
});
