import type { ProviderRole, ServiceType, UserRole } from '../types'

export function formatService(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function formatStatus(status: string): string {
  return status.replace(/_/g, ' ')
}

export function roleLabel(role: UserRole | string): string {
  const labels: Record<string, string> = {
    customer: 'Customer',
    gardener: 'Gardener',
    electrician: 'Electrician',
    plumber: 'Plumber',
    admin: 'Admin',
  }
  return labels[role] ?? role
}

export const SERVICE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'gardener', label: 'Gardener' },
]

export const BOOKING_STATUSES = [
  'assigned',
  'pending',
  'in_progress',
  'completed',
  'cancelled',
] as const

export const PROVIDER_SERVICE_OPTIONS: { value: ProviderRole; label: string }[] = [
  { value: 'plumber', label: 'Plumber' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'gardener', label: 'Gardener' },
]

export function isProviderRole(role: string): boolean {
  return role !== 'customer' && role !== 'admin'
}

export function providerDashboardPath(_role?: string): string {
  return '/provider-dashboard'
}

export function adminDashboardPath(): string {
  return '/admin-dashboard'
}

export function homePathForRole(role: string): string {
  if (role === 'admin') return adminDashboardPath()
  if (role === 'customer') return '/customer-dashboard'
  if (isProviderRole(role)) return providerDashboardPath(role)
  return '/'
}
