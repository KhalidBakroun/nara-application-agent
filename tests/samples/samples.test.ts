import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const dir = path.resolve(__dirname, "../../public/samples");
const expected = ["lina-tawjihi.jpg", "lina-english.jpg", "omar-tawjihi.jpg", "sara-tawjihi.jpg", "sara-english.jpg"];

describe("sample document photos", () => {
  it.each(expected)("%s exists and is at least 800 px wide", async (file) => {
    const full = path.join(dir, file);
    expect(existsSync(full)).toBe(true);
    const meta = await sharp(full).metadata();
    expect(meta.width ?? 0).toBeGreaterThanOrEqual(800);
  });

  it("gives Omar no English test report (he has not taken one)", () => {
    expect(existsSync(path.join(dir, "omar-english.jpg"))).toBe(false);
  });
});
