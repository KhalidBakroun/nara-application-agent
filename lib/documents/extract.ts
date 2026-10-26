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
