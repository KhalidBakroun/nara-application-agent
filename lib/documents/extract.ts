import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { ModelClient } from "@/lib/meta/modelClient";

export type DocType = "tawjihi_certificate" | "passport" | "english_test" | "other";

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  /** x0, y0, x1, y1 in pixels of the cropped page. */
  box: [number, number, number, number];
  confidence: "high" | "medium" | "low";
}

export interface ExtractedDocument {
  documentId: string;
  docType: DocType;
  fields: ExtractedField[];
  /** The cleaned page image the field boxes refer to, with its pixel size. */
  cropDataUrl?: string;
  width?: number;
  height?: number;
}

const DOC_TYPES = ["tawjihi_certificate", "passport", "english_test", "other"] as const;
const CONFIDENCE = ["high", "medium", "low"] as const;

// Meta's grounding guidance: the instruction sits in the user message next to the image, opens with the
// grounding-expert framing, and boxes come back as [x_min, y_min, x_max, y_max] on a 0–1000 grid.
const PROMPT = `You are an object grounding expert reading one photographed student document for a university application.
Say what kind of document it is, then find every field listed below that is printed on it. Do not miss any.
Copy every value exactly as printed: keep Arabic text and Arabic-Indic digits as they are. Never guess a value that is not printed; omit fields you cannot find.
For each field give "box" as [x_min, y_min, x_max, y_max] on a 0-1000 grid of this image ((0, 0) top-left, (1000, 1000) bottom-right), tight around the printed value only, not its label.
"label" is a short English name for the field. Confidence: high when the text is sharp and clear, medium when partly unclear, low when unsure.
Field keys:
- tawjihi_certificate: full_name, nationality, stream, graduation_year, average, certificate_number
- english_test: full_name, test_type, overall_band, test_date
- passport: full_name, nationality, passport_number, date_of_birth, expiry_date
For any other document use docType "other" and short snake_case keys.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["docType", "fields"],
  properties: {
    docType: { type: "string", enum: [...DOC_TYPES] },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "label", "value", "box", "confidence"],
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          value: { type: "string" },
          box: { type: "array", items: { type: "number" } },
          confidence: { type: "string", enum: [...CONFIDENCE] },
        },
      },
    },
  },
};

const extraction = z.object({
  docType: z.enum(DOC_TYPES),
  fields: z.array(
    z.object({
      key: z.string().min(1),
      label: z.string(),
      value: z.string(),
      box: z.tuple([z.number(), z.number(), z.number(), z.number()]),
      confidence: z.enum(CONFIDENCE),
    }),
  ),
});

/** 0–1000 grid value → pixels along a side of `length`; the model may emit slightly out-of-range values at edges. */
const toPixels = (v: number, length: number) => Math.round((Math.min(Math.max(v, 0), 1000) * length) / 1000);

/**
 * Reads the fields of one document page with muse-spark-1.3. `size` is the pixel size of that page, used to map
 * the boxes back onto it. Throws when the reply does not match the schema.
 */
export async function extractDocument(
  model: ModelClient,
  pageDataUrl: string,
  size: { width: number; height: number },
): Promise<ExtractedDocument> {
  const turn = await model.respond({
    input: [
      {
        role: "user",
        content: [
          { type: "input_image", image_url: pageDataUrl },
          { type: "input_text", text: PROMPT },
        ],
      },
    ],
    jsonSchema: { name: "extracted_document", schema: SCHEMA },
  });
  const parsed = extraction.parse(JSON.parse(turn.text ?? ""));
  const fields: ExtractedField[] = parsed.fields.map((f) => ({
    ...f,
    box: [toPixels(f.box[0], size.width), toPixels(f.box[1], size.height), toPixels(f.box[2], size.width), toPixels(f.box[3], size.height)],
  }));
  return { documentId: randomUUID(), docType: parsed.docType, fields, ...size };
}
