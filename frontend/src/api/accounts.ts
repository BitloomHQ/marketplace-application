import { apiRequest } from './client'
import type { LoginResponse, User, UserRole } from '../types'

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
  address: string
}) {
  return apiRequest<{ success: boolean; message: string }>(
    '/api/accounts/register/',
    { method: 'POST', body: data, auth: false },
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
