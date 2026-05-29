import L from 'leaflet'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import {
  fetchMapsPlaceDetails,
  fetchMapsReverseGeocode,
  fetchMapsStatus,
  fetchPlaceAutocomplete,
} from '../api/accounts'
import { Alert, Field, Input } from './ui'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER: [number, number] = [28.6139, 77.209]

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

type Props = {
  address: string
  lat: number | null
  lon: number | null
  onAddressChange: (value: string) => void
  onLocationChange: (lat: number | null, lon: number | null, address?: string) => void
  disabled?: boolean
}

type Suggestion = { place_id: string; description: string }

function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

function MapClickHandler({
  onPick,
  disabled,
}: {
  onPick: (lat: number, lon: number) => void
  disabled?: boolean
}) {
  useMapEvents({
    click(e) {
      if (disabled) return
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function ManualLocationFields({
  address,
  lat,
  lon,
  onAddressChange,
  onLocationChange,
  disabled,
  hint,
}: Props & { hint?: string }) {
  return (
    <div className="space-y-3">
      {hint && <Alert variant="error">{hint}</Alert>}
      <Field label="Full address">
        <Input
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Noida Sector 62"
          required
          disabled={disabled}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude">
          <Input
            type="number"
            step="any"
            value={lat ?? ''}
            onChange={(e) => {
              const v = e.target.value
              onLocationChange(v ? Number(v) : null, lon)
            }}
            placeholder="28.6139"
            required
            disabled={disabled}
          />
        </Field>
        <Field label="Longitude">
          <Input
            type="number"
            step="any"
            value={lon ?? ''}
            onChange={(e) => {
              const v = e.target.value
              onLocationChange(lat, v ? Number(v) : null)
            }}
            placeholder="77.2090"
            required
            disabled={disabled}
          />
        </Field>
      </div>
    </div>
  )
}

export function AddressLocationPicker(props: Props) {
  const { address, lat, lon, onAddressChange, onLocationChange, disabled } = props

  const [configured, setConfigured] = useState<boolean | null>(null)
  const [query, setQuery] = useState(address)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mapCenter: [number, number] =
    lat != null && lon != null ? [lat, lon] : DEFAULT_CENTER

  useEffect(() => {
    setQuery(address)
  }, [address])

  useEffect(() => {
    fetchMapsStatus()
      .then((res) => setConfigured(res.configured))
      .catch(() => setConfigured(false))
  }, [])

  useEffect(() => {
    if (!showSuggestions) return
    const onDocClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [showSuggestions])

  const applyCoordinates = useCallback(
    async (nextLat: number, nextLon: number, keepAddress = false) => {
      onLocationChange(nextLat, nextLon)
      if (keepAddress) return
      try {
        const res = await fetchMapsReverseGeocode(nextLat, nextLon)
        if (res.address) {
          onAddressChange(res.address)
          setQuery(res.address)
        }
      } catch {
        /* keep typed address */
      }
    },
    [onAddressChange, onLocationChange],
  )

  const runSearch = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (text.trim().length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetchPlaceAutocomplete(text.trim())
        setSuggestions(res.predictions)
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 300)
  }, [])

  const pickSuggestion = async (item: Suggestion) => {
    setShowSuggestions(false)
    setQuery(item.description)
    onAddressChange(item.description)
    try {
      const res = await fetchMapsPlaceDetails(item.place_id)
      onLocationChange(res.lat, res.lon, res.address)
      if (res.address) {
        onAddressChange(res.address)
        setQuery(res.address)
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (configured === null) {
    return <p className="text-sm text-zinc-400">Loading map…</p>
  }

  if (!configured) {
    return (
      <ManualLocationFields
        {...props}
        hint="Set GOOGLE_MAPS_API_KEY in the project root .env (backend only), then restart Django."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div ref={searchRef} className="relative z-[1000]">
        <Field label="Search address">
          <Input
            value={query}
            onChange={(e) => {
              const v = e.target.value
              setQuery(v)
              onAddressChange(v)
              runSearch(v)
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="Start typing your address"
            disabled={disabled}
            autoComplete="off"
          />
        </Field>
        {searching && (
          <p className="absolute right-2 top-9 text-xs text-zinc-400">Searching…</p>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-[1001] mt-1 max-h-48 overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-xl">
            {suggestions.map((s) => (
              <li key={s.place_id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-violet-50"
                  onClick={() => pickSuggestion(s)}
                >
                  {s.description}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative z-0 overflow-hidden rounded-xl border border-zinc-200">
        <MapContainer
          center={mapCenter}
          zoom={lat != null ? 16 : 12}
          className="relative z-0 h-[220px] w-full"
          scrollWheelZoom={!disabled}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={mapCenter} />
          <MapClickHandler
            disabled={disabled}
            onPick={(nextLat, nextLon) => applyCoordinates(nextLat, nextLon)}
          />
          {lat != null && lon != null && (
            <Marker
              position={[lat, lon]}
              draggable={!disabled}
              eventHandlers={{
                dragend: (e) => {
                  const pos = e.target.getLatLng()
                  applyCoordinates(pos.lat, pos.lng)
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <p className="text-xs text-zinc-500">
        Search above, tap the map, or drag the pin. Address lookup runs on the server.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude">
          <Input value={lat ?? ''} readOnly placeholder="Pick on map" />
        </Field>
        <Field label="Longitude">
          <Input value={lon ?? ''} readOnly placeholder="Pick on map" />
        </Field>
      </div>
    </div>
  )
}
