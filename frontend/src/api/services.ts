import { apiRequest } from './client'
import { toServiceCategory, type CatalogService, type SpotlightImage } from './catalog'
import type {
  Booking,
  Lead,
  PolygonPoint,
  PopularProvider,
  ProviderRole,
  Quote,
  ServiceCategory,
  User,
} from '../types'

const CUSTOMER_HOME_CACHE_KEY = 'marketplace_customer_home_v1'
const CUSTOMER_HOME_TTL_MS = 45_000

export type CustomerHomeData = {
  booked_count: number
  open_requests: number
  services: ServiceCategory[]
  popularServices: ServiceCategory[]
  comingSoonServices: ServiceCategory[]
  spotlights: SpotlightImage[]
  expiresAt: number
}

export function clearCustomerHomeCache() {
  sessionStorage.removeItem(CUSTOMER_HOME_CACHE_KEY)
}

function readCustomerHomeCache(): CustomerHomeData | null {
  try {
    const raw = sessionStorage.getItem(CUSTOMER_HOME_CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as CustomerHomeData
    if (cached.expiresAt <= Date.now()) {
      sessionStorage.removeItem(CUSTOMER_HOME_CACHE_KEY)
      return null
    }
    return cached
  } catch {
    return null
  }
}

export async function fetchCustomerHome(force = false): Promise<CustomerHomeData> {
  if (!force) {
    const cached = readCustomerHomeCache()
    if (cached) return cached
  }

  const res = await apiRequest<{
    success: boolean
    booked_count: number
    open_requests: number
    catalog: {
      active_services: CatalogService[]
      popular_services: CatalogService[]
      coming_soon_services: CatalogService[]
      spotlights: SpotlightImage[]
    }
  }>('/api/services/customer-home/')

  const data: CustomerHomeData = {
    booked_count: res.booked_count,
    open_requests: res.open_requests,
    services: res.catalog.active_services.map(toServiceCategory),
    popularServices: res.catalog.popular_services.map(toServiceCategory),
    comingSoonServices: res.catalog.coming_soon_services.map(toServiceCategory),
    spotlights: res.catalog.spotlights ?? [],
    expiresAt: Date.now() + CUSTOMER_HOME_TTL_MS,
  }

  sessionStorage.setItem(CUSTOMER_HOME_CACHE_KEY, JSON.stringify(data))
  return data
}

export type ServiceRequestSummary = {
  id: number
  service_type: string
  address: string
  lat?: number | null
  lon?: number | null
  lawn_area?: number | null
  polygon_points?: PolygonPoint[] | null
  description: string | null
  status: string
  is_booked: boolean
  booking_id: number | null
  booking_status: string | null
  created_at: string
  provider_id: number | null
  provider: string | null
  provider_email: string | null
  provider_phone: string | null
  provider_address: string | null
  provider_role?: string | null
  is_verified?: boolean | null
  provider_profile_picture?: string | null
  bio?: string | null
  experience_years?: number | null
  portfolio_images?: { id: number; image: string; caption: string }[]
  average_rating: number | null
  total_reviews: number | null
}

export function createServiceRequest(data: {
  service_type: string
  address_id: number
  description?: string
  lawn_area?: number
  polygon_points?: PolygonPoint[]
  image?: File
}) {
  const formData = new FormData()
  formData.append('service_type', data.service_type)
  formData.append('address_id', String(data.address_id))
  if (data.description) formData.append('description', data.description)
  if (data.lawn_area != null) formData.append('lawn_area', String(data.lawn_area))
  if (data.polygon_points?.length) {
    formData.append('polygon_points', JSON.stringify(data.polygon_points))
  }
  if (data.image) formData.append('image', data.image)

  return apiRequest<{ success: boolean; request_id: number }>(
    '/api/services/create/',
    { method: 'POST', formData },
  ).then((res) => {
    clearCustomerHomeCache()
    return res
  })
}

export function fetchProviderLeads() {
  return apiRequest<{ success: boolean; leads: Lead[] }>(
    '/api/services/provider-leads/',
  )
}

export function fetchLeadDetail(requestId: number) {
  return apiRequest<{ success: boolean; lead: Lead }>(
    `/api/services/lead/${requestId}/`,
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

export function fetchDashboardStats() {
  return apiRequest<{
    success: boolean
    role: 'customer' | 'provider'
    booked_count?: number
    open_requests?: number
    dashboard_type?: string
    features?: string[]
    new_jobs?: number
    active_jobs?: number
    average_rating?: number
    total_reviews?: number
  }>('/api/services/dashboard-stats/')
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

export function fetchPopularProviders() {
  return apiRequest<{ success: boolean; providers: PopularProvider[] }>(
    '/api/services/popular-providers/',
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
  bio?: string
  experience_years?: number
  service_type?: ProviderRole
  profile_picture?: File | null
  profile_picture_key?: string
}) {
  const formData = new FormData()
  if (data.username) formData.append('username', data.username)
  if (data.email) formData.append('email', data.email)
  if (data.phone != null) formData.append('phone', data.phone)
  if (data.address != null) formData.append('address', data.address)
  if (data.bio != null) formData.append('bio', data.bio)
  if (data.experience_years != null) {
    formData.append('experience_years', String(data.experience_years))
  }
  if (data.service_type) formData.append('service_type', data.service_type)
  if (data.profile_picture_key) {
    formData.append('profile_picture_key', data.profile_picture_key)
  } else if (data.profile_picture) {
    formData.append('profile_picture', data.profile_picture)
  }

  return apiRequest<{
    success: boolean
    message: string
    user: User
  }>('/api/services/update-profile/', { method: 'POST', formData })
}
