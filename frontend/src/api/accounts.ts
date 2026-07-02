import { apiRequest } from './client'
import { normalizeAddress } from '../lib/address'
import type { CustomerAddress, LoginResponse, ServiceCategory, User, UserRole, ActiveService } from '../types'

export function login(email: string, password: string) {
  return apiRequest<LoginResponse>('/api/accounts/login/', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
}

export function register(data: {
  username: string
  email: string
  password: string
  phone: string
  role: UserRole
}) {
  return apiRequest<{ success: boolean; message: string }>(
    '/api/accounts/register/',
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
