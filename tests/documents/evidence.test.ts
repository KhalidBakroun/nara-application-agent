import { describe, expect, it } from "vitest";
import { evidenceView } from "@/lib/documents/evidence";

const inside = (inner: number[], outer: { left: number; top: number; width: number; height: number }) =>
  inner[0] >= outer.left && inner[1] >= outer.top && inner[2] <= outer.left + outer.width && inner[3] <= outer.top + outer.height;

describe("evidenceView", () => {
  it("zooms to a window around the value, with the padded highlight inside it", () => {
    const { window, highlight } = evidenceView([500, 300, 560, 330], 1000, 700);
    expect(window.width).toBeLessThan(1000);
    expect(window.height).toBeLessThan(700);
    expect(highlight[0]).toBeLessThan(500);
    expect(highlight[2]).toBeGreaterThan(560);
    expect(inside(highlight, window)).toBe(true);
  });

  it("keeps the window on the page when the value sits at an edge", () => {
    const { window } = evidenceView([960, 680, 1000, 700], 1000, 700);
    expect(window.left + window.width).toBeLessThanOrEqual(1000);
    expect(window.top + window.height).toBeLessThanOrEqual(700);
    expect(window.left).toBeGreaterThanOrEqual(0);
    expect(window.top).toBeGreaterThanOrEqual(0);
  });

  it("never makes the window bigger than the page", () => {
    const { window } = evidenceView([0, 0, 1000, 700], 1000, 700);
    expect(window).toEqual({ left: 0, top: 0, width: 1000, height: 700 });
  });
});
