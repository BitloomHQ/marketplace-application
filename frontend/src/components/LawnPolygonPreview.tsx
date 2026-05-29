import { useState } from 'react'
import { normalizePolygonPoints, polygonAreaSqMeters } from '../lib/polygon'
import type { LegacyPolygonPoint, PolygonPoint } from '../lib/polygon'
import { LawnMapPreviewModal } from './LawnMapPreviewModal'
import { LawnPolygonMap } from './LawnPolygonMap'

type Props = {
  centerLat: number
  centerLon: number
  polygonPoints?: (PolygonPoint | LegacyPolygonPoint)[] | null
  lawnArea?: number | null
  compact?: boolean
  expandable?: boolean
  title?: string
}

export function LawnPolygonPreview({
  centerLat,
  centerLon,
  polygonPoints,
  lawnArea,
  compact = false,
  expandable = true,
  title = 'Customer lawn area',
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const points = normalizePolygonPoints(polygonPoints)

  if (points.length < 3) {
    return (
      <p className="text-xs text-zinc-400">
        Lawn outline not available (older request or incomplete map data).
      </p>
    )
  }

  const area = lawnArea ?? Math.round(polygonAreaSqMeters(points))

  const map = (
    <LawnPolygonMap
      centerLat={centerLat}
      centerLon={centerLon}
      points={points}
      readOnly
      className={compact ? 'h-[180px] w-full' : 'h-[220px] w-full'}
    />
  )

  return (
    <>
      <div className="mt-2 space-y-1">
        <p className="text-xs font-medium text-violet-600">
          {title}
          {lawnArea != null ? `: ${area} m²` : ''}
        </p>
        {expandable ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="group relative w-full overflow-hidden rounded-xl border border-violet-200 ring-1 ring-violet-100 transition hover:border-violet-400 hover:ring-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            aria-label="View lawn map full size"
          >
            {map}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-2 text-left text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
              Tap to enlarge
            </span>
          </button>
        ) : (
          <div className="overflow-hidden rounded-xl border border-violet-200 ring-1 ring-violet-100">
            {map}
          </div>
        )}
      </div>

      <LawnMapPreviewModal
        open={expanded}
        onClose={() => setExpanded(false)}
        centerLat={centerLat}
        centerLon={centerLon}
        points={points}
        lawnArea={area}
      />
    </>
  )
}
