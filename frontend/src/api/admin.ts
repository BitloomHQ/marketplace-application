import { apiRequest } from './client'
import type { ServiceCategory, User } from '../types'

export type AdminDashboardData = {
  users: {
    total_customers: number
    active_customers: number
    inactive_customers: number
    total_providers: number
    active_providers: number
    inactive_providers: number
    pending_providers: number
    approved_providers: number
    verified_providers: number
  }
  services: {
    total_services: number
    active_services: number
    coming_soon_services: number
    inactive_services: number
  }
  marketplace: {
    total_requests: number
    total_quotes: number
    total_bookings: number
    completed_bookings: number
    cancelled_bookings: number
    total_reviews: number
  }
}

export type AdminProvider = User & {
  bio?: string | null
  experience_years?: number | null
  is_active: boolean
  is_approved: boolean
  is_verified: boolean
  status_note?: string
  deactivate_reason?: string | null
  profile_picture?: string | null
  date_joined: string
}

function normalizeAdminProvider(provider: AdminProvider): AdminProvider {
  return {
    ...provider,
    deactivate_reason: provider.deactivate_reason ?? provider.status_note ?? null,
  }
}

export function fetchAdminDashboard() {
  return apiRequest<{ success: boolean; data: AdminDashboardData }>(
    '/api/admin-panel/dashboard/',
  )
}

export function fetchPendingProviders() {
  return apiRequest<{ success: boolean; providers: AdminProvider[] }>(
    '/api/admin-panel/providers/pending/',
  ).then((res) => ({ ...res, providers: res.providers.map(normalizeAdminProvider) }))
}

export function fetchAllProviders() {
  return apiRequest<{ success: boolean; providers: AdminProvider[] }>(
    '/api/admin-panel/providers/',
  ).then((res) => ({ ...res, providers: res.providers.map(normalizeAdminProvider) }))
}

export function approveProvider(providerId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/approve/`,
    { method: 'POST' },
  )
}

export function rejectProvider(providerId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/reject/`,
    { method: 'POST', body: { reason } },
  )
}

export function activateProvider(providerId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/activate/`,
    { method: 'POST', body: { reason } },
  )
}

export function deactivateProvider(providerId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/deactivate/`,
    { method: 'POST', body: { reason } },
  )
}

export function verifyProvider(providerId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/verify/`,
    { method: 'POST', body: { reason } },
  )
}

export function unverifyProvider(providerId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/unverify/`,
    { method: 'POST', body: { reason } },
  )
}

export function fetchAdminServices() {
  return apiRequest<{ success: boolean; services: ServiceCategory[] }>(
    '/api/admin-panel/services/',
  )
}

export function createAdminService(data: {
  name: string
  key: string
  description: string
  status?: string
  start_date?: string
  display_order?: number
  service_image?: File | null
}) {
  const formData = new FormData()
  formData.append('name', data.name)
  formData.append('key', data.key)
  formData.append('description', data.description)
  if (data.status) formData.append('status', data.status)
  if (data.start_date) formData.append('start_date', data.start_date)
  if (data.display_order != null) formData.append('display_order', String(data.display_order))
  if (data.service_image) formData.append('service_image', data.service_image)

  return apiRequest<{ success: boolean; message: string; service_id: number }>(
    '/api/admin-panel/services/create/',
    { method: 'POST', formData },
  )
}

export function updateAdminService(
  serviceId: number,
  data: Partial<{
    name: string
    key: string
    description: string
    status: string
    start_date: string
    display_order: number
    service_image: File | null
  }>,
) {
  const formData = new FormData()
  if (data.name != null) formData.append('name', data.name)
  if (data.description != null) formData.append('description', data.description)
  if (data.status != null) formData.append('status', data.status)
  if (data.start_date != null) formData.append('start_date', data.start_date)
  if (data.display_order != null) formData.append('display_order', String(data.display_order))
  if (data.service_image) formData.append('service_image', data.service_image)

  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/services/${serviceId}/update/`,
    { method: 'PATCH', formData },
  )
}

export function deleteAdminService(serviceId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/services/${serviceId}/delete/`,
    { method: 'DELETE', body: { reason } },
  )
}

export function fetchAdminCustomers() {
  return apiRequest<{
    success: boolean
    customers: (User & { is_active: boolean; date_joined: string; profile_picture?: string | null })[]
  }>('/api/admin-panel/customers/')
}

export function activateCustomer(customerId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/customers/${customerId}/activate/`,
    { method: 'POST' },
  )
}

export function deactivateCustomer(customerId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/customers/${customerId}/deactivate/`,
    { method: 'POST' },
  )
}

export function fetchAdminRequests() {
  return apiRequest<{ success: boolean; requests: Record<string, unknown>[] }>(
    '/api/admin-panel/requests/',
  )
}

export function fetchAdminBookings() {
  return apiRequest<{ success: boolean; bookings: Record<string, unknown>[] }>(
    '/api/admin-panel/bookings/',
  )
}

export function fetchAdminQuotes() {
  return apiRequest<{ success: boolean; quotes: Record<string, unknown>[] }>(
    '/api/admin-panel/quotes/',
  )
}

export function fetchProviderPerformance() {
  return apiRequest<{ success: boolean; providers: Record<string, unknown>[] }>(
    '/api/admin-panel/provider-performance/',
  )
}
