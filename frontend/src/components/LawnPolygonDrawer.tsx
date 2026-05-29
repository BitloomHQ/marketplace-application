import { polygonAreaSqMeters, type PolygonPoint } from '../lib/polygon'
import { Button } from './ui'
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
  const remaining = MAX_CORNERS - value.length

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-500">
        Satellite view of your address — tap each of the{' '}
        <strong>4 corners</strong> of the lawn ({value.length}/{MAX_CORNERS} placed).
      </p>
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <LawnPolygonMap
          centerLat={centerLat}
          centerLon={centerLon}
          points={value}
          onChange={disabled ? undefined : onChange}
          maxPoints={MAX_CORNERS}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-zinc-700">
          Area:{' '}
          <span className="text-violet-600">
            {areaM2 > 0 ? `${areaM2} m²` : value.length < 3 ? 'Add 3+ corners' : '—'}
          </span>
        </p>
        <Button
          type="button"
          variant="ghost"
          className="py-1 text-xs"
          disabled={disabled || value.length === 0}
          onClick={() => onChange([])}
        >
          Clear
        </Button>
      </div>
      {remaining > 0 && value.length > 0 && (
        <p className="text-xs text-violet-600">{remaining} more corner{remaining !== 1 ? 's' : ''} to go</p>
      )}
    </div>
  )
}
