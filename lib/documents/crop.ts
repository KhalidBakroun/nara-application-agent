import sharp from "sharp";
import type { Box } from "./segment";

/** Cuts the box out of the image with `pad` pixels of margin, clamped to the image edges. Returns a JPEG. */
export async function cropBox(img: Buffer, box: Box, pad = 12): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(img).metadata();
  const left = Math.max(0, Math.floor(box[0] - pad));
  const top = Math.max(0, Math.floor(box[1] - pad));
  const right = Math.min(width, Math.ceil(box[2] + pad));
  const bottom = Math.min(height, Math.ceil(box[3] + pad));
  if (right <= left || bottom <= top) throw new RangeError("The box lies outside the image");
  return sharp(img)
    .extract({ left, top, width: right - left, height: bottom - top })
    .jpeg({ quality: 88 })
    .toBuffer();
}
