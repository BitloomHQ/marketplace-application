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
  first_name?: string
  last_name?: string
  full_name?: string
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

export function reorderAdminServices(order: number[]) {
  return apiRequest<{ success: boolean; message: string }>(
    '/api/admin-panel/services/reorder/',
    { method: 'POST', body: { order } },
  )
}

export function deleteAdminService(serviceId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/services/${serviceId}/delete/`,
    { method: 'DELETE', body: { reason } },
  )
}

export type AdminCustomer = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string
  address: string
  is_active: boolean
  is_email_verified: boolean
  profile_picture: string | null
  date_joined: string
  last_login?: string | null
}

export type AdminPermissions = {
  manage_providers: boolean
  manage_customers: boolean
  manage_services: boolean
  manage_bookings: boolean
  manage_quotes: boolean
  view_reports: boolean
  manage_spotlights: boolean
  manage_admin_users: boolean
}

export type AdminStaffUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  is_staff: boolean
  is_superuser: boolean
  is_active: boolean
  date_joined: string
  permissions: AdminPermissions
}

export function fetchAdminCustomers() {
  return apiRequest<{
    success: boolean
    customers: AdminCustomer[]
  }>('/api/admin-panel/customers/')
}

export function fetchAdminCustomerDetail(customerId: number) {
  return apiRequest<{ success: boolean; data: AdminCustomer }>(
    `/api/admin-panel/customers/${customerId}/`,
  )
}

export function updateAdminCustomer(
  customerId: number,
  data: Partial<{
    username: string
    email: string
    first_name: string
    last_name: string
    phone: string
    address: string
    profile_picture: File | null
  }>,
) {
  const formData = new FormData()
  if (data.username != null) formData.append('username', data.username)
  if (data.email != null) formData.append('email', data.email)
  if (data.first_name != null) formData.append('first_name', data.first_name)
  if (data.last_name != null) formData.append('last_name', data.last_name)
  if (data.phone != null) formData.append('phone', data.phone)
  if (data.address != null) formData.append('address', data.address)
  if (data.profile_picture) formData.append('profile_picture', data.profile_picture)

  return apiRequest<{ success: boolean; message: string; data: AdminCustomer }>(
    `/api/admin-panel/customers/${customerId}/update/`,
    { method: 'PATCH', formData },
  )
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

export function fetchAdminMarketplaceMonitor(sections?: Array<'bookings' | 'quotes' | 'providers'>) {
  const query = sections?.length ? `?sections=${sections.join(',')}` : ''
  return apiRequest<{
    success: boolean
    bookings?: AdminBooking[]
    quotes?: AdminQuote[]
    providers?: AdminProviderPerformance[]
  }>(`/api/admin-panel/marketplace/monitor/${query}`)
}

export function fetchAdminBookings() {
  return apiRequest<{ success: boolean; bookings: AdminBooking[] }>(
    '/api/admin-panel/bookings/',
  )
}

export function fetchAdminQuotes() {
  return apiRequest<{ success: boolean; quotes: AdminQuote[] }>(
    '/api/admin-panel/quotes/',
  )
}

export function fetchProviderPerformance() {
  return apiRequest<{ success: boolean; providers: AdminProviderPerformance[] }>(
    '/api/admin-panel/provider-performance/',
  )
}

export function fetchAdminSpotlights() {
  return apiRequest<{ success: boolean; count: number; data: Record<string, unknown>[] }>(
    '/api/admin-panel/spotlights/',
  )
}

export function createAdminSpotlight(data: FormData) {
  return apiRequest<{ success: boolean; message: string; data: Record<string, unknown> }>(
    '/api/admin-panel/spotlights/create/',
    { method: 'POST', formData: data },
  )
}

export function updateAdminSpotlight(spotlightId: number, data: FormData) {
  return apiRequest<{ success: boolean; message: string; data: Record<string, unknown> }>(
    `/api/admin-panel/spotlights/${spotlightId}/update/`,
    { method: 'PATCH', formData: data },
  )
}

export function deleteAdminSpotlight(spotlightId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/spotlights/${spotlightId}/delete/`,
    { method: 'DELETE' },
  )
}

export function updateAdminProvider(
  providerId: number,
  data: Partial<{
    username: string
    email: string
    first_name: string
    last_name: string
    phone: string
    address: string
    bio: string
    experience_years: number | null
    profile_picture: File | null
  }>,
) {
  const formData = new FormData()
  if (data.username != null) formData.append('username', data.username)
  if (data.email != null) formData.append('email', data.email)
  if (data.first_name != null) formData.append('first_name', data.first_name)
  if (data.last_name != null) formData.append('last_name', data.last_name)
  if (data.phone != null) formData.append('phone', data.phone)
  if (data.address != null) formData.append('address', data.address)
  if (data.bio != null) formData.append('bio', data.bio)
  if (data.experience_years != null) {
    formData.append('experience_years', String(data.experience_years))
  } else if (data.experience_years === null && 'experience_years' in data) {
    formData.append('experience_years', '')
  }
  if (data.profile_picture) formData.append('profile_picture', data.profile_picture)

  return apiRequest<{ success: boolean; message: string; data: AdminProvider }>(
    `/api/admin-panel/providers/${providerId}/update/`,
    { method: 'PATCH', formData },
  )
}

export function fetchAdminUsers() {
  return apiRequest<{ success: boolean; count: number; data: AdminStaffUser[] }>(
    '/api/admin-panel/admin-users/',
  )
}

export function fetchAdminUserDetail(adminId: number) {
  return apiRequest<{ success: boolean; data: AdminStaffUser }>(
    `/api/admin-panel/admin-users/${adminId}/`,
  )
}

export function createAdminUser(data: {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
  permissions: AdminPermissions
}) {
  return apiRequest<{ success: boolean; message: string; data: AdminStaffUser }>(
    '/api/admin-panel/admin-users/create/',
    { method: 'POST', body: data },
  )
}

export function updateAdminUser(
  adminId: number,
  data: Partial<{
    email: string
    first_name: string
    last_name: string
    permissions: AdminPermissions
  }>,
) {
  return apiRequest<{ success: boolean; message: string; data: AdminStaffUser }>(
    `/api/admin-panel/admin-users/${adminId}/update/`,
    { method: 'PATCH', body: data },
  )
}

export function activateAdminUser(adminId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/admin-users/${adminId}/activate/`,
    { method: 'POST' },
  )
}

export function deactivateAdminUser(adminId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/admin-users/${adminId}/deactivate/`,
    { method: 'POST' },
  )
}

export function deleteAdminUser(adminId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/admin-users/${adminId}/delete/`,
    { method: 'DELETE' },
  )
}

export function fetchAdminProviderDetail(providerId: number) {
  return apiRequest<{ success: boolean; data: AdminProvider }>(
    `/api/admin-panel/providers/${providerId}/`,
  ).then((res) => ({
    ...res,
    data: normalizeAdminProvider(res.data),
  }))
}

export type AdminBooking = {
  id: number
  service_request_id: number
  service_type: string
  customer_id: number
  customer: string
  provider_id: number
  provider: string
  final_price: number
  status: string
  created_at: string
  updated_at: string
}

export type AdminQuote = {
  id: number
  service_request_id: number
  service_type: string
  customer: string
  provider_id: number
  provider: string
  price: number
  message: string
  status: string
  created_at: string
}

export type AdminProviderPerformance = {
  provider_id: number
  provider: string
  email: string
  phone: string
  role: string
  is_active: boolean
  is_approved: boolean
  is_verified: boolean
  profile_picture: string | null
  total_quotes: number
  accepted_quotes: number
  acceptance_rate: number
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  completion_rate: number
  total_reviews: number
  average_rating: number
}
