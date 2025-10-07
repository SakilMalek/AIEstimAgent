// client/src/utils/geometry.ts
import type { XY } from "@/lib/types";

export function polygonArea(points: XY[]): number {
  if (!points || points.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) * 0.5;
}

export function polygonPerimeter(points: XY[]): number {
  if (!points || points.length < 2) return 0;
  let per = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    per += Math.hypot(x2 - x1, y2 - y1);
  }
  return per;
}
