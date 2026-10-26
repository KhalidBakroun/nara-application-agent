export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Box = [number, number, number, number];

/**
 * What the review card shows for one field: a zoomed window of the page around the value, and the highlight
 * inside it, both in page pixels. Muse Spark's boxes are approximate (a few percent of the page), so the
 * highlight is padded and the window keeps the surrounding line in view.
 */
export function evidenceView([x0, y0, x1, y1]: Box, width: number, height: number): { window: Rect; highlight: Box } {
  const boxH = y1 - y0;
  const highlight: Box = [
    Math.max(0, x0 - 0.015 * width),
    Math.max(0, y0 - 0.25 * boxH),
    Math.min(width, x1 + 0.015 * width),
    Math.min(height, y1 + 0.25 * boxH),
  ];
  // Centre a window of span + 2 × margin on the highlight, shifted (not shrunk) to stay on the page.
  const fit = (start: number, end: number, margin: number, total: number) => {
    const size = Math.min(total, end - start + 2 * margin);
    return [Math.min(Math.max(0, (start + end) / 2 - size / 2), total - size), size];
  };
  const [left, w] = fit(highlight[0], highlight[2], 0.12 * width, width);
  const [top, h] = fit(highlight[1], highlight[3], Math.max(2 * boxH, 0.05 * height), height);
  return { window: { left, top, width: w, height: h }, highlight };
}
