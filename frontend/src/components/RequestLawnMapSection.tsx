import { normalizePolygonPoints } from '../lib/polygon'
import type { LegacyPolygonPoint, PolygonPoint } from '../lib/polygon'
import { LawnPolygonPreview } from './LawnPolygonPreview'

type Props = {
  serviceType: string
  lat?: number | null
  lon?: number | null
  lawnArea?: number | null
  polygonPoints?: (PolygonPoint | LegacyPolygonPoint)[] | null
}

/** Lawn satellite map for gardener requests (customer + provider views). */
export function RequestLawnMapSection({
  serviceType,
  lat,
  lon,
  lawnArea,
  polygonPoints,
}: Props) {
  if (serviceType !== 'gardener') return null
  if (lat == null || lon == null) return null
  if (!polygonPoints?.length) return null
  if (normalizePolygonPoints(polygonPoints).length < 3) return null

  return (
    <LawnPolygonPreview
      centerLat={lat}
      centerLon={lon}
      polygonPoints={polygonPoints}
      lawnArea={lawnArea}
      title="Your lawn area"
      compact
    />
  )
}
