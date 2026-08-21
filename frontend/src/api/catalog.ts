import { apiRequest } from './client'
import type { ServiceCategory, ServiceCategoryStatus } from '../types'

export type CatalogService = {
  id: number
  name: string
  key: string
  description: string
  service_image: string | null
  status: ServiceCategoryStatus
  start_date?: string
  display_order?: number
  is_popular?: boolean
  is_available?: boolean
}

export type SpotlightImage = {
  id: number
  title: string
  subtitle?: string | null
  image_url: string | null
  redirect_url?: string | null
  display_order: number
}

export function toServiceCategory(service: CatalogService): ServiceCategory {
  return {
    id: service.id,
    name: service.name,
    key: service.key,
    description: service.description,
    status: service.status,
    service_image: service.service_image,
    start_date: service.start_date ?? 'Yet to start',
    display_order: service.display_order,
  }
}

function catalogUrl(params?: { status?: 'active' | 'all'; popular?: boolean }) {
  const search = new URLSearchParams()
  if (params?.popular) {
    search.set('popular', 'true')
  } else if (params?.status) {
    search.set('status', params.status)
  }
  const qs = search.toString()
  return `/api/admin-panel/services/public/${qs ? `?${qs}` : ''}`
}

export function fetchCatalogServices(params?: { status?: 'active' | 'all'; popular?: boolean }) {
  return apiRequest<{
    success: boolean
    message: string
    count: number
    data: CatalogService[]
  }>(catalogUrl(params), { auth: false })
}

/** Active services only — for booking flows. */
export async function fetchBookableServices() {
  const res = await fetchCatalogServices({ status: 'active' })
  return {
    success: res.success,
    services: res.data.map(toServiceCategory),
  }
}

/** Active + coming soon — for provider registration. */
export async function fetchRegisterableServices() {
  const res = await fetchCatalogServices({ status: 'all' })
  return {
    success: res.success,
    services: res.data.map(toServiceCategory),
  }
}

/** Active services marked popular in admin. */
export async function fetchPopularCatalogServices() {
  const res = await fetchCatalogServices({ popular: true })
  return {
    success: res.success,
    services: res.data.map(toServiceCategory),
  }
}

export function fetchPublicSpotlights() {
  return apiRequest<{
    success: boolean
    message: string
    count: number
    data: SpotlightImage[]
  }>('/api/admin-panel/spotlights/public/', { auth: false })
}

export async function fetchComingSoonServices() {
  const res = await apiRequest<{
    success: boolean
    coming_soon_services: CatalogService[]
  }>('/api/accounts/public-services/', { auth: false })

  return {
    success: res.success,
    services: (res.coming_soon_services ?? []).map(toServiceCategory),
  }
}

export async function loadHomeCatalog() {
  const res = await apiRequest<{
    success: boolean
    message: string
    data: {
      active_services: CatalogService[]
      popular_services: CatalogService[]
      coming_soon_services: CatalogService[]
      spotlights: SpotlightImage[]
    }
  }>('/api/admin-panel/catalog/home/', { auth: false })

  return {
    services: res.data.active_services.map(toServiceCategory),
    popularServices: res.data.popular_services.map(toServiceCategory),
    comingSoonServices: res.data.coming_soon_services.map(toServiceCategory),
    spotlights: res.data.spotlights ?? [],
  }
}

export function registerableServiceLabel(service: ServiceCategory) {
  return service.status === 'coming_soon' ? `${service.name} (Coming soon)` : service.name
}
