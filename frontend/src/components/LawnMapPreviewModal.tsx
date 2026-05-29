import type { PolygonPoint } from '../lib/polygon'
import { LawnPolygonMap } from './LawnPolygonMap'

type Props = {
  open: boolean
  onClose: () => void
  centerLat: number
  centerLon: number
  points: PolygonPoint[]
  lawnArea?: number | null
}

export function LawnMapPreviewModal({
  open,
  onClose,
  centerLat,
  centerLon,
  points,
  lawnArea,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pb-tab-bar sm:pb-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/85 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close lawn map"
      />
      <div
        className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Lawn area map"
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <p className="text-sm font-semibold text-zinc-900">
            Customer lawn area
            {lawnArea != null ? <span className="text-violet-600"> · {lawnArea} m²</span> : null}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-100 p-2 text-zinc-600 hover:bg-zinc-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-2">
          <LawnPolygonMap
            key="lawn-map-expanded"
            centerLat={centerLat}
            centerLon={centerLon}
            points={points}
            readOnly
            className="h-[min(70dvh,520px)] w-full rounded-xl"
          />
        </div>
        <p className="border-t border-zinc-100 px-4 py-2 text-center text-xs text-zinc-500">
          Pinch or scroll to zoom · Purple outline is the marked lawn
        </p>
      </div>
    </div>
  )
}
