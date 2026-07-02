import { polygonAreaSqMeters, type PolygonPoint } from '../lib/polygon'
import { LawnPolygonMap } from './LawnPolygonMap'

const MAX_CORNERS = 4

type Props = {
  centerLat: number
  centerLon: number
  value: PolygonPoint[]
  onChange: (points: PolygonPoint[]) => void
  disabled?: boolean
}

export function LawnPolygonDrawer({
  centerLat,
  centerLon,
  value,
  onChange,
  disabled,
}: Props) {
  const areaM2 = value.length >= 3 ? Math.round(polygonAreaSqMeters(value)) : 0

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500">
        Satellite view of your address — tap each of the{' '}
        <strong className="font-semibold text-zinc-700">4 corners</strong> of the lawn (
        {value.length}/{MAX_CORNERS} placed).
      </p>
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <LawnPolygonMap
          centerLat={centerLat}
          centerLon={centerLon}
          points={value}
          onChange={disabled ? undefined : onChange}
          maxPoints={MAX_CORNERS}
          className="h-[200px] w-full sm:h-[220px]"
        />
      </div>
      <div className="flex items-center justify-between gap-2 text-sm">
        <p className="font-medium text-zinc-700">
          Area:{' '}
          <span className="font-semibold text-sky-600">
            {areaM2 > 0 ? `${areaM2} m²` : 'Add 3+ corners'}
          </span>
        </p>
        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={() => onChange([])}
          className="font-semibold text-rose-500 hover:text-rose-600 disabled:opacity-40"
        >
          ✕ Clear
        </button>
      </div>
    </div>
  )
}
