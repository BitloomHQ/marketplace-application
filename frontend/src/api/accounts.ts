import { apiRequest } from './client'
import { normalizeAddress } from '../lib/address'
import type {
  AccountProfile,
  ActiveService,
  CustomerAddress,
  LoginResponse,
  RegisterResponse,
  ServiceCategory,
  User,
  UserRole,
} from '../types'

export function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/api/accounts/login/', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
}

export function register(data: {
  name: string
  email: string
  password: string
  confirm_password: string
  role: UserRole
}) {
  return apiRequest<RegisterResponse>('/api/accounts/register/', {
    method: 'POST',
    body: data,
    auth: false,
  })
}

export function verifyEmail(email: string, otp: string) {
  return apiRequest<{
    success: boolean
    message: string
    data: {
      user_id: number
      email: string
      role: string
      is_email_verified: boolean
      is_approved: boolean
      next_step: string
    }
  }>('/api/accounts/verify-email/', {
    method: 'POST',
    body: { email, otp },
    auth: false,
  })
}

export function resendEmailOtp(email: string) {
  return apiRequest<{
    success: boolean
    message: string
    data?: { email: string; otp_expires_in_minutes: number }
    code?: string
    retry_after_seconds?: number
  }>('/api/accounts/resend-email-otp/', {
    method: 'POST',
    body: { email },
    auth: false,
  })
}

export function fetchAccountProfile() {
  return apiRequest<{
    success: boolean
    message: string
    data: { profile: AccountProfile; profile_completion: number }
  }>('/api/accounts/profile/')
}

export function updateAccountProfile(data: {
  first_name?: string
  last_name?: string
  phone?: string
  address?: string
  bio?: string
  experience_years?: number | null
}) {
  return apiRequest<{
    success: boolean
    message: string
    data: {
      profile: AccountProfile
      profile_completion: number
      missing_fields: string[]
    }
  }>('/api/accounts/profile/update/', { method: 'PATCH', body: data })
}

export function uploadProfileImage(file: File) {
  const formData = new FormData()
  formData.append('profile_picture', file)
  return apiRequest<{
    success: boolean
    message: string
    data: { profile_picture: string | null; profile_completion: number }
  }>('/api/accounts/profile/image/', { method: 'POST', formData })
}

export function deleteProfileImage() {
  return apiRequest<{
    success: boolean
    message: string
    data: { profile_picture: null; profile_completion: number }
  }>('/api/accounts/profile/image/delete/', { method: 'DELETE' })
}

export function fetchProfileCompletion() {
  return apiRequest<{
    success: boolean
    message: string
    data: {
      percentage: number
      completed_count: number
      total_fields: number
      completed_fields: string[]
      missing_fields: string[]
      is_complete: boolean
    }
  }>('/api/accounts/profile/completion/')
}

export function changePassword(data: {
  old_password: string
  new_password: string
  confirm_password: string
}) {
  return apiRequest<{ success: boolean; message: string }>(
    '/api/accounts/change-password/',
    { method: 'POST', body: data },
  )
}

export function forgotPassword(email: string) {
  return apiRequest<{ success: boolean; message: string }>(
    '/api/accounts/forgot-password/',
    { method: 'POST', body: { email }, auth: false },
  )
}

export function resetPassword(data: {
  uid: string
  token: string
  new_password: string
  confirm_password: string
}) {
  return apiRequest<{ success: boolean; message: string }>(
    '/api/accounts/reset-password/',
    { method: 'POST', body: data, auth: false },
  )
}

export async function fetchMyAddresses() {
  const res = await apiRequest<{
    success: boolean
    addresses: CustomerAddress[]
  }>('/api/accounts/my-addresses/')
  return {
    ...res,
    addresses: res.addresses.map(normalizeAddress),
  }
}

export async function addAddress(data: {
  title: string
  address: string
  latitude: number
  longitude: number
}) {
  const res = await apiRequest<{
    success: boolean
    address: CustomerAddress
  }>('/api/accounts/add-address/', { method: 'POST', body: data })
  return { ...res, address: normalizeAddress(res.address) }
}

export async function editAddress(
  addressId: number,
  data: {
    title?: string
    address?: string
    latitude?: number
    longitude?: number
    lat?: number
    lon?: number
  },
) {
  const body = {
    ...data,
    lat: data.lat ?? data.latitude,
    lon: data.lon ?? data.longitude,
    latitude: data.latitude ?? data.lat,
    longitude: data.longitude ?? data.lon,
  }
  const res = await apiRequest<{
    success: boolean
    message: string
    address: CustomerAddress
  }>(`/api/accounts/edit-address/${addressId}/`, { method: 'POST', body })
  return { ...res, address: normalizeAddress(res.address) }
}

export function fetchMapsStatus() {
  return apiRequest<{ success: boolean; configured: boolean }>(
    '/api/accounts/maps/status/',
  )
}

export function fetchPlaceAutocomplete(input: string) {
  return apiRequest<{
    success: boolean
    configured: boolean
    predictions: { place_id: string; description: string }[]
  }>(`/api/accounts/maps/autocomplete/?input=${encodeURIComponent(input)}`)
}

export function fetchMapsPlaceDetails(placeId: string) {
  return apiRequest<{
    success: boolean
    address: string
    lat: number
    lon: number
  }>(`/api/accounts/maps/place-details/?place_id=${encodeURIComponent(placeId)}`)
}

export function fetchMapsGeocodeAddress(address: string) {
  return apiRequest<{
    success: boolean
    address: string
    lat: number
    lon: number
  }>(`/api/accounts/maps/geocode-address/?address=${encodeURIComponent(address)}`)
}

export function fetchMapsReverseGeocode(lat: number, lon: number) {
  return apiRequest<{
    success: boolean
    address: string
    lat: number
    lon: number
  }>(
    `/api/accounts/maps/reverse-geocode/?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`,
  )
}

export function deleteAddress(addressId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/accounts/delete-address/${addressId}/`,
    { method: 'DELETE' },
  )
}

export function fetchCustomerDashboard() {
  return apiRequest<{
    success: boolean
    customer: Pick<User, 'id' | 'username' | 'email' | 'phone' | 'address'>
  }>('/api/accounts/customer-dashboard/')
}

export function fetchProviders(service: string) {
  return apiRequest<{
    success: boolean
    service: string
    total_providers: number
    providers: User[]
  }>(`/api/accounts/providers/?service=${service}`)
}

export function fetchDashboard() {
  return apiRequest<{
    success: boolean
    message: string
    data: User & {
      dashboard_type: string
      features: string[]
      popular_services?: ServiceCategory[]
      services?: ServiceCategory[]
      average_rating?: number
      total_reviews?: number
    }
  }>('/api/accounts/dashboard/')
}

export function fetchActiveServices() {
  return apiRequest<{ success: boolean; services: ActiveService[] }>(
    '/api/accounts/active-services/',
    { auth: false },
  )
}

export function fetchPublicServices() {
  return apiRequest<{
    success: boolean
    services: ServiceCategory[]
    popular_services: ServiceCategory[]
    coming_soon_services: ServiceCategory[]
  }>('/api/accounts/public-services/', { auth: false })
}
