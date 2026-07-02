import type { ProviderRole, ServiceType } from '../types'

const BOOKABLE_KEYS = new Set<string>(['plumber', 'electrician', 'gardener'])

export function isBookableServiceKey(key: string): key is ServiceType {
  return BOOKABLE_KEYS.has(key)
}

export function isProviderRoleKey(key: string): key is ProviderRole {
  return BOOKABLE_KEYS.has(key)
}
