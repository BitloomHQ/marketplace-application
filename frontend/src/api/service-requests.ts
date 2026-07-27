import { apiRequest } from './client'

export function fetchServiceRequests() {
  return apiRequest<{
    success: boolean
    message: string
    count: number
    data: Record<string, unknown>[]
  }>('/api/service-requests/')
}

export function createServiceRequest(body: Record<string, unknown>) {
  return apiRequest<{
    success: boolean
    message: string
    data: Record<string, unknown>
  }>('/api/service-requests/', { method: 'POST', body })
}
