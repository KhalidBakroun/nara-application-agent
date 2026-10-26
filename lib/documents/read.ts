import sharp from "sharp";
import { createMetaModelClient } from "@/lib/meta/modelClient";
import { cropBox } from "./crop";
import { extractDocument, type ExtractedDocument } from "./extract";
import { findDocument, type Box } from "./segment";

/** Longest side sent to the models: phone photos are far larger than reading needs. */
const MAX_SIDE = 1600;

export interface ReadDeps {
  segment?: (imageDataUrl: string) => Promise<{ box: Box } | null>;
  extract?: (pageDataUrl: string, size: { width: number; height: number }) => Promise<ExtractedDocument>;
  pad?: number;
}

const toDataUrl = (jpeg: Buffer) => `data:image/jpeg;base64,${jpeg.toString("base64")}`;

/**
 * Photo → the document page (found by sam-3.1 and cropped) → fields with boxes on that page.
 * When no document is found, the full photo is read and every field is marked low confidence,
 * so the counsellor checks it.
 */
export async function readDocument(photo: Buffer, deps: ReadDeps = {}): Promise<ExtractedDocument> {
  const segment = deps.segment ?? ((url) => findDocument(url));
  const extract = deps.extract ?? ((url, size) => extractDocument(createMetaModelClient(), url, size));

  const image = await sharp(photo)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 88 })
    .toBuffer();

  const found = await segment(toDataUrl(image)).catch((err) => {
    console.warn("Document segmentation failed, reading the full photo:", (err as Error).message);
    return null;
  });
  const cropped = found ? await cropBox(image, found.box, deps.pad).catch(() => null) : null;
  const page = cropped ?? image;

  const { width = 0, height = 0 } = await sharp(page).metadata();
  const doc = await extract(toDataUrl(page), { width, height });
  const fields = cropped ? doc.fields : doc.fields.map((f) => ({ ...f, confidence: "low" as const }));
  return { ...doc, fields, cropDataUrl: toDataUrl(page), width, height };
}
