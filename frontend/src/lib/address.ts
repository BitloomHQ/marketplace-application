import type { CustomerAddress } from '../types'

/** Normalize API address (latitude/longitude) for map components (lat/lon). */
export function addressLatLon(
  address: Pick<CustomerAddress, 'latitude' | 'longitude' | 'lat' | 'lon'>,
): { lat: number; lon: number } | null {
  const lat = address.latitude ?? address.lat ?? null
  const lon = address.longitude ?? address.lon ?? null
  if (lat == null || lon == null) return null
  return { lat, lon }
}

export function normalizeAddress<T extends {
  id: number
  title: string
  address: string
  latitude?: number | null
  longitude?: number | null
  lat?: number | null
  lon?: number | null
}>(item: T): CustomerAddress {
  const lat = item.latitude ?? item.lat ?? null
  const lon = item.longitude ?? item.lon ?? null
  return {
    id: item.id,
    title: item.title,
    address: item.address,
    latitude: lat,
    longitude: lon,
    lat,
    lon,
  }
}
