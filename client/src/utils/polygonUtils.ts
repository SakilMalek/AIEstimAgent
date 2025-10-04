// src/utils/polygonUtils.ts
import type { Point } from "../store/useStore"

/**
 * Douglas-Peucker polygon simplification algorithm
 * @param points Array of points
 * @param tolerance Maximum distance a point can be from the simplified line
 * @returns Simplified array of points
 */
export function douglasPeucker(points: Point[], tolerance: number = 2): Point[] {
  if (points.length <= 2) return points
  
  // Find the point with the maximum distance from the line between first and last
  let maxDistance = 0
  let maxIndex = 0
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], firstPoint, lastPoint)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = i
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const firstHalf = douglasPeucker(points.slice(0, maxIndex + 1), tolerance)
    const secondHalf = douglasPeucker(points.slice(maxIndex), tolerance)
    
    // Combine results, removing duplicate point at junction
    return [...firstHalf.slice(0, -1), ...secondHalf]
  }
  
  // If no point exceeds tolerance, return just the endpoints
  return [firstPoint, lastPoint]
}

/**
 * Calculate perpendicular distance from a point to a line segment
 */
export function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const [px, py] = point
  const [x1, y1] = lineStart
  const [x2, y2] = lineEnd
  
  const dx = x2 - x1
  const dy = y2 - y1
  
  if (dx === 0 && dy === 0) {
    // Line segment is actually a point
    return Math.hypot(px - x1, py - y1)
  }
  
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)
  
  if (t < 0) {
    // Point is closest to line start
    return Math.hypot(px - x1, py - y1)
  } else if (t > 1) {
    // Point is closest to line end
    return Math.hypot(px - x2, py - y2)
  } else {
    // Point projects onto the line segment
    const projX = x1 + t * dx
    const projY = y1 + t * dy
    return Math.hypot(px - projX, py - projY)
  }
}

/**
 * Check if a point is inside a rectangle
 */
export function pointInRectangle(point: Point, rectStart: Point, rectEnd: Point): boolean {
  const [px, py] = point
  const minX = Math.min(rectStart[0], rectEnd[0])
  const maxX = Math.max(rectStart[0], rectEnd[0])
  const minY = Math.min(rectStart[1], rectEnd[1])
  const maxY = Math.max(rectStart[1], rectEnd[1])
  
  return px >= minX && px <= maxX && py >= minY && py <= maxY
}

/**
 * Calculate distance between two points
 */
export function pointDistance(p1: Point, p2: Point): number {
  return Math.hypot(p2[0] - p1[0], p2[1] - p1[1])
}

/**
 * Find vertices that are clustered too closely together
 * @param points Array of polygon points
 * @param threshold Minimum distance between vertices
 * @returns Indices of vertices that should be removed
 */
export function findClusteredVertices(points: Point[], threshold: number = 5): number[] {
  const toRemove: number[] = []
  const visited = new Set<number>()
  
  for (let i = 0; i < points.length; i++) {
    if (visited.has(i)) continue
    
    const cluster: number[] = [i]
    visited.add(i)
    
    // Find all points within threshold distance
    for (let j = i + 1; j < points.length; j++) {
      if (visited.has(j)) continue
      
      if (pointDistance(points[i], points[j]) < threshold) {
        cluster.push(j)
        visited.add(j)
      }
    }
    
    // If cluster has more than 1 point, mark extras for removal
    if (cluster.length > 1) {
      // Keep the first point, remove the rest
      toRemove.push(...cluster.slice(1))
    }
  }
  
  return toRemove.sort((a, b) => b - a) // Sort in reverse order for safe removal
}

/**
 * Simplify polygon by removing redundant points (points that lie on straight lines)
 * @param points Array of polygon points
 * @param tolerance Angular tolerance in degrees
 * @returns Simplified points array
 */
export function removeRedundantPoints(points: Point[], tolerance: number = 5): Point[] {
  if (points.length <= 3) return points
  
  const simplified: Point[] = []
  const toleranceRad = (tolerance * Math.PI) / 180
  
  for (let i = 0; i < points.length; i++) {
    const prev = points[(i - 1 + points.length) % points.length]
    const curr = points[i]
    const next = points[(i + 1) % points.length]
    
    // Calculate angle between vectors (prev->curr) and (curr->next)
    const v1 = [curr[0] - prev[0], curr[1] - prev[1]]
    const v2 = [next[0] - curr[0], next[1] - curr[1]]
    
    const angle = Math.abs(Math.atan2(v1[0] * v2[1] - v1[1] * v2[0], v1[0] * v2[0] + v1[1] * v2[1]))
    
    // If angle is close to 0 or π (straight line), skip this point
    if (angle > toleranceRad && angle < Math.PI - toleranceRad) {
      simplified.push(curr)
    }
  }
  
  // Ensure we keep at least 3 points for a valid polygon
  return simplified.length >= 3 ? simplified : points
}

/**
 * Smart polygon simplification combining multiple techniques
 * @param points Array of polygon points
 * @param options Simplification options
 * @returns Simplified points array
 */
export function smartSimplify(
  points: Point[], 
  options: {
    douglasPeuckerTolerance?: number
    clusterThreshold?: number
    angleThreshold?: number
    minPoints?: number
  } = {}
): Point[] {
  const {
    douglasPeuckerTolerance = 2,
    clusterThreshold = 5,
    angleThreshold = 5,
    minPoints = 3
  } = options
  
  if (points.length <= minPoints) return points
  
  // Step 1: Remove clustered vertices
  const clustered = findClusteredVertices(points, clusterThreshold)
  let simplified = points.filter((_, i) => !clustered.includes(i))
  
  if (simplified.length <= minPoints) return points
  
  // Step 2: Remove redundant points on straight lines
  simplified = removeRedundantPoints(simplified, angleThreshold)
  
  if (simplified.length <= minPoints) return points
  
  // Step 3: Apply Douglas-Peucker algorithm
  simplified = douglasPeucker(simplified, douglasPeuckerTolerance)
  
  // Ensure we don't go below minimum points
  return simplified.length >= minPoints ? simplified : points
}

/**
 * Calculate the optimal position for a dialog/toolbar relative to a polygon
 * @param points Polygon points
 * @param dialogSize Size of the dialog box [width, height]
 * @param canvasSize Size of the canvas [width, height]
 * @returns Optimal position [x, y] for the dialog
 */
export function calculateOptimalDialogPosition(
  points: Point[], 
  dialogSize: [number, number], 
  canvasSize: [number, number]
): Point {
  if (points.length === 0) return [0, 0]
  
  // Calculate polygon centroid
  const centroid = points.reduce(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1]], 
    [0, 0] as Point
  ).map(coord => coord / points.length) as Point
  
  const [dialogWidth, dialogHeight] = dialogSize
  const [canvasWidth, canvasHeight] = canvasSize
  
  // Try positions around the centroid in order of preference
  const positions: Point[] = [
    [centroid[0] - dialogWidth / 2, centroid[1] - dialogHeight - 20], // Above
    [centroid[0] - dialogWidth / 2, centroid[1] + 20], // Below
    [centroid[0] - dialogWidth - 20, centroid[1] - dialogHeight / 2], // Left
    [centroid[0] + 20, centroid[1] - dialogHeight / 2], // Right
    [centroid[0] - dialogWidth / 2, centroid[1] - dialogHeight / 2], // Center (fallback)
  ]
  
  // Find the first position that fits within canvas bounds
  for (const [x, y] of positions) {
    if (x >= 10 && y >= 10 && 
        x + dialogWidth <= canvasWidth - 10 && 
        y + dialogHeight <= canvasHeight - 10) {
      return [x, y]
    }
  }
  
  // If no position fits perfectly, clamp to canvas bounds
  const clampedX = Math.max(10, Math.min(centroid[0] - dialogWidth / 2, canvasWidth - dialogWidth - 10))
  const clampedY = Math.max(10, Math.min(centroid[1] - dialogHeight / 2, canvasHeight - dialogHeight - 10))
  
  return [clampedX, clampedY]
}