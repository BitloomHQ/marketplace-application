import L from 'leaflet'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polygon, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { PolygonPoint } from '../lib/polygon'

const SATELLITE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const CORNER_COLORS = ['#7c3aed', '#2563eb', '#059669', '#d97706']

type Props = {
  centerLat: number
  centerLon: number
  points: PolygonPoint[]
  onChange?: (points: PolygonPoint[]) => void
  readOnly?: boolean
  maxPoints?: number
  className?: string
}

function FitPolygonBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    if (positions.length === 1) {
      map.setView(positions[0], 19)
      return
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [28, 28], maxZoom: 19 })
  }, [map, positions])
  return null
}

function MapClickAdd({
  disabled,
  onAdd,
}: {
  disabled?: boolean
  onAdd: (lat: number, lon: number) => void
}) {
  useMapEvents({
    click(e) {
      if (disabled) return
      onAdd(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export function LawnPolygonMap({
  centerLat,
  centerLon,
  points,
  onChange,
  readOnly = false,
  maxPoints = 4,
  className = 'h-[240px] w-full',
}: Props) {
  const positions = useMemo(
    () => points.map((p) => [p.lat, p.lon] as [number, number]),
    [points],
  )

  const handleAdd = (lat: number, lon: number) => {
    if (!onChange || readOnly || points.length >= maxPoints) return
    onChange([...points, { lat, lon }])
  }

  return (
    <MapContainer
      center={[centerLat, centerLon]}
      zoom={19}
      className={`relative z-0 ${className}`}
      scrollWheelZoom={!readOnly}
    >
      <TileLayer
        url={SATELLITE_URL}
        attribution="Tiles &copy; Esri"
        maxZoom={20}
      />
      <FitPolygonBounds positions={positions.length ? positions : [[centerLat, centerLon]]} />
      {!readOnly && (
        <MapClickAdd disabled={points.length >= maxPoints} onAdd={handleAdd} />
      )}
      {positions.length >= 3 && (
        <Polygon
          positions={positions}
          pathOptions={{
            color: '#6d28d9',
            weight: 2,
            fillColor: '#8b5cf6',
            fillOpacity: 0.35,
          }}
        />
      )}
      {positions.length >= 2 && positions.length < 3 && (
        <Polygon
          positions={positions}
          pathOptions={{ color: '#6d28d9', weight: 2, dashArray: '6 4', fillOpacity: 0 }}
        />
      )}
      {points.map((p, i) => (
        <Marker
          key={`${p.lat}-${p.lon}-${i}`}
          position={[p.lat, p.lon]}
          icon={L.divIcon({
            className: '',
            html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${CORNER_COLORS[i % CORNER_COLORS.length]};color:#fff;font-size:12px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)">${i + 1}</span>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          })}
        />
      ))}
    </MapContainer>
  )
}
