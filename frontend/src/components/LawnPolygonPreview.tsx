import { normalizePolygonPoints, polygonAreaSqMeters } from '../lib/polygon'
import type { LegacyPolygonPoint, PolygonPoint } from '../lib/polygon'
import { LawnPolygonMap } from './LawnPolygonMap'

type Props = {
  centerLat: number
  centerLon: number
  polygonPoints?: (PolygonPoint | LegacyPolygonPoint)[] | null
  lawnArea?: number | null
  compact?: boolean
}

export function LawnPolygonPreview({
  centerLat,
  centerLon,
  polygonPoints,
  lawnArea,
  compact = false,
}: Props) {
  const points = normalizePolygonPoints(polygonPoints)

  if (points.length < 3) {
    return (
      <p className="text-xs text-zinc-400">
        Lawn outline not available (older request or incomplete map data).
      </p>
    )
  }

  const area = lawnArea ?? Math.round(polygonAreaSqMeters(points))

  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs font-medium text-violet-600">
        Customer lawn area{lawnArea != null ? `: ${area} m²` : ''}
      </p>
      <div className="overflow-hidden rounded-xl border border-violet-200 ring-1 ring-violet-100">
        <LawnPolygonMap
          centerLat={centerLat}
          centerLon={centerLon}
          points={points}
          readOnly
          className={compact ? 'h-[180px] w-full' : 'h-[220px] w-full'}
        />
      </div>
    </div>
  )
}
