import { apiRequest } from './client'

export type ProviderLocationData = {
  latitude: number | null
  longitude: number | null
  location_source: 'live' | 'manual' | null
  location_text: string | null
  service_radius_km: number
  admin_max_radius_km: number
  effective_radius_km: number
  is_location_matching_enabled: boolean
  is_online: boolean
  is_available: boolean
  last_location_updated_at: string | null
}

export function fetchProviderLocation() {
  return apiRequest<{
    success: boolean
    message: string
    data: ProviderLocationData
  }>('/api/providers/location/')
}

export function updateProviderLocation(body: {
  latitude?: number
  longitude?: number
  location_source?: 'live' | 'manual'
  location_text?: string
  service_radius_km?: number
  is_online?: boolean
}) {
  return apiRequest<{
    success: boolean
    message: string
    data: ProviderLocationData
  }>('/api/providers/location/', { method: 'PATCH', body })
}

export function fetchProviderProfile() {
  return apiRequest<{
    success: boolean
    message: string
    data: Record<string, unknown>
  }>('/api/providers/profile/')
}

export function createProviderProfile(body: Record<string, unknown>) {
  return apiRequest<{
    success: boolean
    message: string
    data: Record<string, unknown>
  }>('/api/providers/profile/', { method: 'POST', body })
}

export function updateProviderProfile(body: Record<string, unknown>) {
  return apiRequest<{
    success: boolean
    message: string
    data: Record<string, unknown>
  }>('/api/providers/profile/', { method: 'PATCH', body })
}

export function fetchProviderServices() {
  return apiRequest<{
    success: boolean
    message: string
    count: number
    data: Record<string, unknown>[]
  }>('/api/providers/services/')
}

export function addProviderService(body: Record<string, unknown>) {
  return apiRequest<{
    success: boolean
    message: string
    data: Record<string, unknown>
  }>('/api/providers/services/', { method: 'POST', body })
}

export function fetchProviderAvailability() {
  return apiRequest<{
    success: boolean
    message: string
    data: Record<string, unknown>[]
  }>('/api/providers/availability/')
}

export function addProviderAvailability(body: Record<string, unknown>) {
  return apiRequest<{
    success: boolean
    message: string
    data: Record<string, unknown>
  }>('/api/providers/availability/', { method: 'POST', body })
}

export function fetchProviderServiceAreas() {
  return apiRequest<{
    success: boolean
    message: string
    count: number
    data: Record<string, unknown>[]
  }>('/api/providers/service-areas/')
}

export function addProviderServiceArea(body: Record<string, unknown>) {
  return apiRequest<{
    success: boolean
    message: string
    data: Record<string, unknown>
  }>('/api/providers/service-areas/', { method: 'POST', body })
}
