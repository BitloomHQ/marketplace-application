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

export function isProviderRole(role: string): role is ProviderRole {
  return role === 'gardener' || role === 'electrician' || role === 'plumber'
}

export function providerDashboardPath(role: string): string {
  if (role === 'gardener') return '/gardener-dashboard'
  if (role === 'electrician') return '/electrician-dashboard'
  if (role === 'plumber') return '/plumber-dashboard'
  return '/dashboard'
}
