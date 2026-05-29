export type PolygonPoint = { x: number; y: number }

/** Shoelace formula — returns area in square pixels (scale via meters-per-pixel if needed). */
export function polygonArea(points: PolygonPoint[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length
    sum += points[i].x * points[j].y - points[j].x * points[i].y
  }
  return Math.abs(sum) / 2
}
