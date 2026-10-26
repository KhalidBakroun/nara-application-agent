import { getMetaClient } from "@/lib/meta/client";

export const SEGMENT_MODEL = "sam-3.1";

/** x0, y0, x1, y1 in pixels of the source image. */
export type Box = [number, number, number, number];

export interface SamBox {
  id: number;
  box: Box;
  /** Source image size, as sam-3.1 reports it. */
  w?: number;
  h?: number;
  c?: number;
}

type ResponsesLike = { responses: { create: (body: never) => Promise<unknown> } };

/**
 * Reads the `id<|box;x1=..;y1=..;x2=..;y2=..;w=..;h=..[;c=..]|>` records of a sam-3.1 reply.
 * An empty reply means zero matches. Masks are ignored: the box is all we crop with.
 */
export function parseSamBoxes(text: string): SamBox[] {
  const boxes: SamBox[] = [];
  for (const m of text.matchAll(/(\d+)<\|box;([^|]*)\|>/g)) {
    const kv = Object.fromEntries(
      m[2].split(";").map((pair) => {
        const [k, v] = pair.split("=");
        return [k, Number(v)];
      }),
    );
    const { x1, y1, x2, y2 } = kv;
    if (![x1, y1, x2, y2].every(Number.isFinite)) continue;
    boxes.push({ id: Number(m[1]), box: [x1, y1, x2, y2], w: kv.w, h: kv.h, ...(kv.c !== undefined && { c: kv.c }) });
  }
  return boxes;
}

/** Asks sam-3.1 for "document" in the photo and returns the largest match, or null when there is none. */
export async function findDocument(
  imageDataUrl: string,
  client: ResponsesLike = getMetaClient() as unknown as ResponsesLike,
): Promise<{ box: Box } | null> {
  const res = (await client.responses.create({
    model: SEGMENT_MODEL,
    input: [{ role: "user", content: [{ type: "input_text", text: "document" }, { type: "input_image", image_url: imageDataUrl }] }],
  } as never)) as { output_text?: string };
  const boxes = parseSamBoxes(res.output_text ?? "");
  if (boxes.length === 0) return null;
  const area = ([x0, y0, x1, y1]: Box) => (x1 - x0) * (y1 - y0);
  return { box: boxes.reduce((a, b) => (area(b.box) > area(a.box) ? b : a)).box };
}
