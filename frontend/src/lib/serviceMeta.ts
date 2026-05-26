import type { ServiceType } from '../types'

export const SERVICE_META: Record<
  ServiceType,
  { emoji: string; tagline: string; color: string; bg: string }
> = {
  plumber: {
    emoji: '🔧',
    tagline: 'Leaks, taps & pipes',
    color: 'text-sky-700',
    bg: 'bg-sky-50',
  },
  electrician: {
    emoji: '⚡',
    tagline: 'Wiring & repairs',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  gardener: {
    emoji: '🌿',
    tagline: 'Lawn & garden care',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
}
