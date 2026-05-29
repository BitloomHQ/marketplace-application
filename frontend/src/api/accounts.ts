import { apiRequest } from './client'
import type { CustomerAddress, LoginResponse, User, UserRole } from '../types'

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

export function fetchMyAddresses() {
  return apiRequest<{ success: boolean; addresses: CustomerAddress[] }>(
    '/api/accounts/my-addresses/',
  )
}

export function addAddress(data: {
  title: string
  address: string
  lat: number
  lon: number
}) {
  return apiRequest<{
    success: boolean
    message: string
    address: CustomerAddress
  }>('/api/accounts/add-address/', { method: 'POST', body: data })
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
    customer: Pick<User, 'id' | 'username' | 'email' | 'phone'>
  }>('/api/accounts/customer-dashboard/')
}

export function fetchProviders(service: string) {
  return apiRequest<{
    success: boolean
    providers: { id: number; username: string }[]
  }>(`/api/accounts/providers/?service=${service}`)
}

export function fetchDashboard() {
  return apiRequest<{
    success: boolean
    data: {
      dashboard_type: string
      features: string[]
      services?: string[]
    } & User
  }>('/api/accounts/dashboard/')
}
