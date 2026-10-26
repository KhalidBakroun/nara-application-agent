import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { cropBox } from "@/lib/documents/crop";
import { extractDocument } from "@/lib/documents/extract";
import { readDocument } from "@/lib/documents/read";
import { findDocument, parseSamBoxes } from "@/lib/documents/segment";
import type { ModelClient } from "@/lib/meta/modelClient";

const fixture = readFileSync(path.resolve(__dirname, "../fixtures/sam-document.txt"), "utf8");

const blankImage = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#ffffff" } }).png().toBuffer();

const goodExtraction = {
  docType: "tawjihi_certificate",
  fields: [
    { key: "full_name", label: "Student name", value: "لينا أحمد الخطيب", box: [600, 80, 980, 120], confidence: "high" },
    { key: "average", label: "Average", value: "٩٢٫١", box: [700, 600, 980, 640], confidence: "high" },
  ],
};

describe("parseSamBoxes", () => {
  it("reads the document box from a real sam-3.1 reply", () => {
    const boxes = parseSamBoxes(fixture);
    expect(boxes.length).toBeGreaterThanOrEqual(1);
    expect(boxes[0]).toMatchObject({ id: 0, box: [128, 143, 1271, 857], w: 1400, h: 1000 });
  });

  it("returns no boxes for an empty reply (zero matches)", () => {
    expect(parseSamBoxes("")).toEqual([]);
  });
});

describe("findDocument", () => {
  it("returns null when sam-3.1 finds nothing", async () => {
    const client = { responses: { create: async () => ({ output_text: "" }) } };
    expect(await findDocument("data:image/jpeg;base64,AAAA", client)).toBeNull();
  });
});

describe("cropBox", () => {
  it("cuts out the box", async () => {
    const out = await sharp(await cropBox(await blankImage(100, 100), [10, 10, 50, 50], 0)).metadata();
    expect([out.width, out.height]).toEqual([40, 40]);
  });

  it("clamps a box that runs past the edge", async () => {
    const out = await sharp(await cropBox(await blankImage(100, 100), [80, 80, 150, 150], 0)).metadata();
    expect([out.width, out.height]).toEqual([20, 20]);
  });
});

describe("extractDocument", () => {
  const reply = (body: unknown): ModelClient => ({ respond: async () => ({ text: JSON.stringify(body), toolCalls: [] }) });

  it("returns the fields the model read, with their boxes", async () => {
    const doc = await extractDocument(reply(goodExtraction), "data:image/png;base64,AAAA", { width: 1143, height: 714 });
    expect(doc.docType).toBe("tawjihi_certificate");
    expect(doc.fields.map((f) => f.key)).toEqual(["full_name", "average"]);
  });

  it("maps boxes from the model's 0–1000 grid to page pixels, clamped to the page", async () => {
    const edge = { docType: "other", fields: [{ key: "x", label: "X", value: "1", box: [500, 250, 1001, 1000], confidence: "high" }] };
    const doc = await extractDocument(reply(edge), "data:image/png;base64,AAAA", { width: 200, height: 100 });
    expect(doc.fields[0].box).toEqual([100, 25, 200, 100]);
  });

  it("rejects a field that comes back without a box", async () => {
    const bad = { ...goodExtraction, fields: [{ key: "full_name", label: "Student name", value: "x", confidence: "high" }] };
    await expect(extractDocument(reply(bad), "data:image/png;base64,AAAA", { width: 10, height: 10 })).rejects.toThrow();
  });
});

describe("readDocument", () => {
  it("falls back to the full photo and low confidence when no document is found", async () => {
    const photo = await blankImage(300, 200);
    const extract = vi.fn(async () => ({ documentId: "x", ...goodExtraction }) as never);

    const doc = await readDocument(photo, { segment: async () => null, extract });

    expect(extract).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/jpeg;base64,/), { width: 300, height: 200 });
    expect([doc.width, doc.height]).toEqual([300, 200]);
    expect(doc.fields.every((f) => f.confidence === "low")).toBe(true);
  });

  it("crops to the document when one is found", async () => {
    const photo = await blankImage(300, 200);
    const extract = vi.fn(async () => ({ documentId: "x", ...goodExtraction }) as never);

    const doc = await readDocument(photo, { segment: async () => ({ box: [50, 40, 250, 160] }), extract, pad: 0 });

    expect([doc.width, doc.height]).toEqual([200, 120]);
    expect(doc.fields[0].confidence).toBe("high");
  });
});
