/** Geographic polygon vertex stored on service requests. */
export type PolygonPoint = { lat: number; lon: number }

/** @deprecated Legacy pixel coordinates from an older canvas UI */
export type LegacyPolygonPoint = { x: number; y: number }

export function isGeoPolygonPoint(
  p: PolygonPoint | LegacyPolygonPoint,
): p is PolygonPoint {
  return typeof (p as PolygonPoint).lat === 'number' && typeof (p as PolygonPoint).lon === 'number'
}

export function normalizePolygonPoints(
  raw: (PolygonPoint | LegacyPolygonPoint)[] | null | undefined,
): PolygonPoint[] {
  if (!raw?.length) return []
  return raw.filter(isGeoPolygonPoint)
}

/** Geodesic area in square metres (WGS84). */
export function polygonAreaSqMeters(points: PolygonPoint[]): number {
  if (points.length < 3) return 0

  const R = 6378137
  let sum = 0
  const n = points.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const lat1 = (points[i].lat * Math.PI) / 180
    const lat2 = (points[j].lat * Math.PI) / 180
    const lon1 = (points[i].lon * Math.PI) / 180
    const lon2 = (points[j].lon * Math.PI) / 180
    sum += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2))
  }

  return Math.abs((sum * R * R) / 2)
}
