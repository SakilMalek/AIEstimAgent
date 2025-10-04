// client/src/utils/geometry.ts
import type { Point } from '../store/useStore'

export function toPairs(points: Point[] | number[]): Point[] {
  // If already in Point[] format, return as-is
  if (points.length === 0) return []
  if (Array.isArray(points[0])) return points as Point[]
  
  // Convert from flat number[] to Point[]
  const result: Point[] = []
  for (let i = 0; i < points.length; i += 2) {
    result.push([(points as number[])[i], (points as number[])[i + 1]])
  }
  return result
}

export function fromPairs(pairs: Point[]): Point[] {
  return pairs
}

export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const [px, py] = p
  const [x1, y1] = a
  const [x2, y2] = b
  
  const dx = x2 - x1
  const dy = y2 - y1
  
  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1)
  }
  
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  
  return Math.hypot(px - cx, py - cy)
}

export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0
  
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    area += points[i][0] * points[j][1]
    area -= points[j][0] * points[i][1]
  }
  
  return Math.abs(area) / 2
}

export function calculatePolygonPerimeter(points: Point[]): number {
  if (points.length < 2) return 0
  
  let perimeter = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    const dx = points[j][0] - points[i][0]
    const dy = points[j][1] - points[i][1]
    perimeter += Math.hypot(dx, dy)
  }
  
  return perimeter
}
