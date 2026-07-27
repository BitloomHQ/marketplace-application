import { apiRequest } from './client'

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
