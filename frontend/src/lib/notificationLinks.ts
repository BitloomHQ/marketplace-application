import { isProviderRole, providerDashboardPath } from './format'

export function resolveNotificationHref(
  title: string,
  role: string,
): string {
  const t = title.toLowerCase()

  if (role === 'customer') {
    if (t.includes('quote') || t.includes('service request')) return '/customer/requests'
    if (t.includes('booking') || t.includes('selected')) return '/customer/bookings'
    return '/customer/requests'
  }

  if (isProviderRole(role)) {
    if (t.includes('service request') || t.includes('new service')) return '/provider/leads'
    if (t.includes('job') || t.includes('booking') || t.includes('review')) {
      return '/provider/bookings'
    }
    return providerDashboardPath(role)
  }

  return '/'
}
