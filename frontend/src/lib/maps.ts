export function mapsUrlFromCoords(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`
}

export function mapsUrlFromAddress(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

export function mapsUrlForLocation(
  address?: string | null,
  lat?: number | null,
  lon?: number | null,
): string | null {
  if (lat != null && lon != null) return mapsUrlFromCoords(lat, lon)
  if (address?.trim()) return mapsUrlFromAddress(address.trim())
  return null
}
