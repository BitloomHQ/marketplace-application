import { apiRequest } from './client'
import type { Booking, Lead, Quote, ServiceType, User } from '../types'

export type ServiceRequestSummary = {
  id: number
  service_type: string
  address: string
  description: string | null
  status: string
  is_booked: boolean
  booking_id: number | null
  booking_status: string | null
  created_at: string
}

export function createServiceRequest(
  data: {
    service_type: ServiceType
    address: string
    description?: string
    lat?: number
    lon?: number
    lawn_area?: number
  },
  image?: File,
) {
  if (image) {
    const formData = new FormData()
    formData.append('service_type', data.service_type)
    formData.append('address', data.address)
    if (data.description) formData.append('description', data.description)
    if (data.lat != null) formData.append('lat', String(data.lat))
    if (data.lon != null) formData.append('lon', String(data.lon))
    if (data.lawn_area != null) formData.append('lawn_area', String(data.lawn_area))
    formData.append('image', image)
    return apiRequest<{ success: boolean; request_id: number }>(
      '/api/services/create/',
      { method: 'POST', formData },
    )
  }

  return apiRequest<{ success: boolean; request_id: number }>(
    '/api/services/create/',
    { method: 'POST', body: data },
  )
}

export function fetchProviderLeads() {
  return apiRequest<{ success: boolean; leads: Lead[] }>(
    '/api/services/provider-leads/',
  )
}

export function sendQuote(data: {
  service_request_id: number
  price: number
  message?: string
}) {
  return apiRequest<{ success: boolean; quote_id: number }>(
    '/api/services/send-quote/',
    { method: 'POST', body: data },
  )
}

export function fetchQuotes(requestId: number) {
  return apiRequest<{ success: boolean; quotes: Quote[] }>(
    `/api/services/view-quotes/${requestId}/`,
  )
}

export function selectProvider(data: {
  service_request_id: number
  quote_id: number
}) {
  return apiRequest<{ success: boolean; booking_id: number }>(
    '/api/services/select-provider/',
    { method: 'POST', body: data },
  )
}

export function fetchMyBookings() {
  return apiRequest<{ success: boolean; bookings: Booking[] }>(
    '/api/services/my-bookings/',
  )
}

export function updateBookingStatus(data: {
  booking_id: number
  status: string
}) {
  return apiRequest<{ success: boolean; status: string }>(
    '/api/services/update-booking-status/',
    { method: 'POST', body: data },
  )
}

export function fetchMyServiceRequests(page = 1, pageSize = 10) {
  return apiRequest<{
    success: boolean
    page: number
    page_size: number
    total: number
    total_pages: number
    booked_count: number
    requests: ServiceRequestSummary[]
  }>(`/api/services/my-requests/?page=${page}&page_size=${pageSize}`)
}

export function fetchNotifications() {
  return apiRequest<{
    success: boolean
    notifications: {
      id: number
      title: string
      message: string
      is_read: boolean
      created_at: string
    }[]
    unread_count: number
  }>('/api/services/notifications/')
}

export function markNotificationsRead() {
  return apiRequest<{ success: boolean; unread_count: number }>(
    '/api/services/notifications/mark-read/',
    { method: 'POST' },
  )
}

export function submitReview(data: {
  booking_id: number
  provider_id: number
  rating: number
  review?: string
}) {
  return apiRequest<{ success: boolean; review_id: number }>(
    '/api/services/submit-review/',
    { method: 'POST', body: data },
  )
}

export function fetchProfile() {
  return apiRequest<{ success: boolean; user: User }>('/api/services/profile/')
}

export function updateProfile(data: {
  username?: string
  email?: string
  phone?: string
  address?: string
}) {
  return apiRequest<{
    success: boolean
    message: string
    user: User
  }>('/api/services/update-profile/', { method: 'POST', body: data })
}
