import { apiRequest } from './client'
import type { ServiceCategory, User } from '../types'

export type AdminAccount = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  admin_type: 'admin' | 'super_admin'
  is_staff: boolean
  is_superuser: boolean
}

export function adminLogin(email: string, password: string) {
  return apiRequest<{
    success: boolean
    message: string
    token: string
    admin: AdminAccount
    redirect_url: string
  }>('/api/admin-panel/login/', { method: 'POST', body: { email, password }, auth: false })
}

export type DashboardPeriod = '7d' | '30d' | '6m' | '1y'

export type DashboardFilters = {
  period?: DashboardPeriod | string | null
  from?: string | null
  to?: string | null
  service?: string | null
  provider_id?: number | null
  status?: string | null
}

export type AdminDashboardData = {
  users: {
    customers: {
      total: number
      active: number
      inactive: number
    }
    providers: {
      total: number
      active: number
      inactive: number
      pending: number
      approved: number
      verified: number
      unverified: number
      pending_approvals: number
    }
  }
  services: {
    total: number
    active: number
    coming_soon: number
    inactive: number
    popular: number
  }
  requests: {
    total: number
    today: number
    this_week: number
    this_month: number
  }
  quotations: {
    total: number
  }
  bookings: {
    total: number
    completed: number
    cancelled: number
    completion_rate: number
    cancellation_rate: number
    total_booking_value: string | number
    average_booking_value: string | number
  }
  reviews: {
    total: number
    average_provider_rating: number
  }
}

export type DashboardTrendsResponse = {
  success: boolean
  message: string
  filters: DashboardFilters
  summary: {
    total_bookings: number
    total_booking_value: number
    active_bookings: number
    completed_bookings: number
    cancelled_bookings: number
    completed_booking_value: number
    average_booking_value: number
    completion_rate: number
    cancellation_rate: number
  }
  chart: {
    labels: string[]
    booking_count: number[]
    completed_bookings: number[]
    cancelled_bookings: number[]
    booking_value: number[]
    completed_booking_value: number[]
  }
}

export type ServicePerformanceRow = {
  service_id: number
  service: string
  service_key: string
  total_requests: number
  total_quotations: number
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  booking_value: string | number
  average_rating: number
  conversion_rate: number
}

export type FunnelStage = {
  stage: string
  count: number
  percentage: number
  overall_conversion_rate?: number
}

export type CustomerAnalyticsResponse = {
  success: boolean
  message: string
  filters: DashboardFilters
  summary: {
    total_customers: number
    active_customers: number
    inactive_customers: number
    new_customers: number
    repeat_customers: number
    customers_with_no_bookings: number
    repeat_booking_rate: number
  }
  top_customers: Array<{
    customer_id: number
    username: string
    full_name: string
    email: string
    total_bookings: number
    completed_bookings: number
    total_spend: string | number
  }>
}

export type GeographicLocation = {
  city: string
  state: string
  total_requests: number
  services: Array<{
    service: string
    service_key: string
    requests: number
  }>
}

function dashboardQuery(params?: DashboardFilters) {
  const search = new URLSearchParams()
  if (params?.period) search.set('period', String(params.period))
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  if (params?.service) search.set('service', params.service)
  if (params?.provider_id != null) search.set('provider_id', String(params.provider_id))
  if (params?.status) search.set('status', params.status)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

const ADMIN_DASHBOARD_CACHE_TTL_MS = 15 * 60 * 1000
const ADMIN_DASHBOARD_CACHE_PREFIX = 'marketplace_admin_dashboard_v3:'

function num(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function normalizeDashboardStats(raw: unknown): AdminDashboardData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, any>
  const users = data.users ?? {}
  const customers = users.customers ?? {}
  const providers = users.providers ?? {}
  const services = data.services ?? {}
  const requests = data.requests ?? {}
  const quotations = data.quotations ?? {}
  const bookings = data.bookings ?? data.marketplace ?? {}
  const reviews = data.reviews ?? {}

  return {
    users: {
      customers: {
        total: num(customers.total ?? users.total_customers),
        active: num(customers.active ?? users.active_customers),
        inactive: num(customers.inactive ?? users.inactive_customers),
      },
      providers: {
        total: num(providers.total ?? users.total_providers),
        active: num(providers.active ?? users.active_providers),
        inactive: num(providers.inactive ?? users.inactive_providers),
        pending: num(providers.pending ?? users.pending_providers),
        approved: num(providers.approved ?? users.approved_providers),
        verified: num(providers.verified ?? users.verified_providers),
        unverified: num(providers.unverified),
        pending_approvals: num(
          providers.pending_approvals ?? providers.pending ?? users.pending_providers,
        ),
      },
    },
    services: {
      total: num(services.total ?? services.total_services),
      active: num(services.active ?? services.active_services),
      coming_soon: num(services.coming_soon ?? services.coming_soon_services),
      inactive: num(services.inactive ?? services.inactive_services),
      popular: num(services.popular),
    },
    requests: {
      total: num(requests.total ?? data.marketplace?.total_requests),
      today: num(requests.today),
      this_week: num(requests.this_week),
      this_month: num(requests.this_month),
    },
    quotations: {
      total: num(quotations.total ?? data.marketplace?.total_quotes),
    },
    bookings: {
      total: num(bookings.total ?? bookings.total_bookings),
      completed: num(bookings.completed ?? bookings.completed_bookings),
      cancelled: num(bookings.cancelled ?? bookings.cancelled_bookings),
      completion_rate: num(bookings.completion_rate),
      cancellation_rate: num(bookings.cancellation_rate),
      total_booking_value: bookings.total_booking_value ?? 0,
      average_booking_value: bookings.average_booking_value ?? 0,
    },
    reviews: {
      total: num(reviews.total ?? data.marketplace?.total_reviews),
      average_provider_rating: num(reviews.average_provider_rating),
    },
  }
}

function normalizeTrends(raw: DashboardTrendsResponse | null | undefined): DashboardTrendsResponse | null {
  if (!raw) return null
  return {
    ...raw,
    summary: {
      total_bookings: num(raw.summary?.total_bookings),
      total_booking_value: num(raw.summary?.total_booking_value),
      active_bookings: num(raw.summary?.active_bookings),
      completed_bookings: num(raw.summary?.completed_bookings),
      cancelled_bookings: num(raw.summary?.cancelled_bookings),
      completed_booking_value: num(raw.summary?.completed_booking_value),
      average_booking_value: num(raw.summary?.average_booking_value),
      completion_rate: num(raw.summary?.completion_rate),
      cancellation_rate: num(raw.summary?.cancellation_rate),
    },
    chart: {
      labels: raw.chart?.labels ?? [],
      booking_count: raw.chart?.booking_count ?? [],
      completed_bookings: raw.chart?.completed_bookings ?? [],
      cancelled_bookings: raw.chart?.cancelled_bookings ?? [],
      booking_value: raw.chart?.booking_value ?? [],
      completed_booking_value: raw.chart?.completed_booking_value ?? [],
    },
  }
}

function normalizeFunnel(stages: FunnelStage[] | undefined): FunnelStage[] {
  return (stages ?? []).map((stage) => ({
    ...stage,
    count: num(stage.count),
    percentage: num(stage.percentage ?? stage.overall_conversion_rate),
  }))
}

function normalizeLocations(geo: {
  locations?: GeographicLocation[]
  cities?: GeographicLocation[]
}): GeographicLocation[] {
  const rows = (geo.locations ?? geo.cities ?? []) as Array<
    GeographicLocation & {
      top_service?: {
        service_name?: string
        service?: string
        service_key?: string
        request_count?: number
        requests?: number
      }
    }
  >
  return rows.map((row) => ({
    city: row.city,
    state: row.state,
    total_requests: num(row.total_requests),
    services:
      row.services ??
      (row.top_service
        ? [
            {
              service: row.top_service.service ?? row.top_service.service_name ?? '',
              service_key: row.top_service.service_key ?? '',
              requests: num(row.top_service.requests ?? row.top_service.request_count),
            },
          ]
        : []),
  }))
}

function normalizeServices(rows: ServicePerformanceRow[] | undefined): ServicePerformanceRow[] {
  return (rows ?? []).map((row) => ({
    ...row,
    service: row.service || (row as { service_name?: string }).service_name || '',
    total_requests: num(row.total_requests),
    total_quotations: num(row.total_quotations),
    total_bookings: num(row.total_bookings),
    completed_bookings: num(row.completed_bookings ?? (row as { completed_jobs?: number }).completed_jobs),
    cancelled_bookings: num(row.cancelled_bookings ?? (row as { cancelled_jobs?: number }).cancelled_jobs),
    booking_value: row.booking_value ?? (row as { total_booking_value?: number }).total_booking_value ?? 0,
    average_rating: num(row.average_rating),
    conversion_rate: num(row.conversion_rate),
  }))
}

export type AdminDashboardBundle = {
  stats: AdminDashboardData
  trends: DashboardTrendsResponse | null
  services: ServicePerformanceRow[]
  funnel: FunnelStage[]
  providers: AdminProviderPerformance[]
  customers: CustomerAnalyticsResponse | null
  locations: GeographicLocation[]
  expiresAt: number
}

function adminDashboardCacheKey(period: string) {
  return `${ADMIN_DASHBOARD_CACHE_PREFIX}${period}`
}

export function readAdminDashboardCache(period: string): AdminDashboardBundle | null {
  try {
    const raw = sessionStorage.getItem(adminDashboardCacheKey(period))
    if (!raw) return null
    const cached = JSON.parse(raw) as AdminDashboardBundle
    if (!cached?.expiresAt || cached.expiresAt <= Date.now()) {
      sessionStorage.removeItem(adminDashboardCacheKey(period))
      return null
    }
    const stats = normalizeDashboardStats(cached.stats)
    if (!stats) {
      sessionStorage.removeItem(adminDashboardCacheKey(period))
      return null
    }
    return {
      ...cached,
      stats,
      trends: normalizeTrends(cached.trends),
      services: normalizeServices(cached.services),
      funnel: normalizeFunnel(cached.funnel),
      providers: cached.providers ?? [],
      customers: cached.customers ?? null,
      locations: normalizeLocations({ locations: cached.locations }),
    }
  } catch {
    return null
  }
}

export function writeAdminDashboardCache(period: string, data: Omit<AdminDashboardBundle, 'expiresAt'>) {
  const payload: AdminDashboardBundle = {
    ...data,
    expiresAt: Date.now() + ADMIN_DASHBOARD_CACHE_TTL_MS,
  }
  sessionStorage.setItem(adminDashboardCacheKey(period), JSON.stringify(payload))
  return payload
}

export function clearAdminDashboardCache() {
  Object.keys(sessionStorage)
    .filter((key) => key.startsWith(ADMIN_DASHBOARD_CACHE_PREFIX))
    .forEach((key) => sessionStorage.removeItem(key))
}

export async function loadAdminDashboardBundle(
  period: DashboardPeriod | string,
  force = false,
): Promise<AdminDashboardBundle> {
  if (!force) {
    const cached = readAdminDashboardCache(String(period))
    if (cached) return cached
  }

  const params = { period }
  const [dashRes, trendsRes, serviceRes, funnelRes, providerRes, customerRes, geoRes] =
    await Promise.all([
      fetchAdminDashboard(params),
      fetchDashboardTrends(params),
      fetchServicePerformance(params),
      fetchRequestFunnel(params),
      fetchProviderPerformance(params),
      fetchCustomerAnalytics(params),
      fetchGeographicAnalytics(params),
    ])

  const stats = normalizeDashboardStats(dashRes.data)
  if (!stats) {
    throw new Error('Admin dashboard payload was missing.')
  }

  return writeAdminDashboardCache(String(period), {
    stats,
    trends: normalizeTrends(trendsRes),
    services: normalizeServices(serviceRes.services),
    funnel: normalizeFunnel(funnelRes.funnel),
    providers: providerRes.providers ?? [],
    customers: customerRes,
    locations: normalizeLocations(geoRes),
  })
}

export type AdminProvider = User & {
  first_name?: string
  last_name?: string
  full_name?: string
  bio?: string | null
  experience_years?: number | null
  is_active: boolean
  is_approved: boolean
  is_verified: boolean
  status_note?: string
  deactivate_reason?: string | null
  profile_picture?: string | null
  date_joined: string
}

function normalizeAdminProvider(provider: AdminProvider): AdminProvider {
  return {
    ...provider,
    deactivate_reason: provider.deactivate_reason ?? provider.status_note ?? null,
  }
}

export type MarketplaceLocationSettings = {
  max_provider_radius_km: number
  default_provider_radius_km: number
  live_location_timeout_minutes: number
  is_location_matching_enabled: boolean
  created_at?: string
  updated_at?: string
}

export function fetchLocationSettings() {
  return apiRequest<{ success: boolean; message: string; data: MarketplaceLocationSettings }>(
    '/api/admin-panel/location-settings/',
  )
}

export function updateLocationSettings(data: Partial<MarketplaceLocationSettings>) {
  return apiRequest<{ success: boolean; message: string; data: MarketplaceLocationSettings }>(
    '/api/admin-panel/location-settings/',
    { method: 'PATCH', body: data },
  )
}

export function fetchAdminDashboard(params?: DashboardFilters) {
  return apiRequest<{
    success: boolean
    message?: string
    filters?: DashboardFilters
    data: AdminDashboardData
  }>(`/api/admin-panel/dashboard/${dashboardQuery(params)}`)
}

export function fetchDashboardTrends(params?: DashboardFilters) {
  return apiRequest<DashboardTrendsResponse>(
    `/api/admin-panel/dashboard/trends/${dashboardQuery(params)}`,
  )
}

export function fetchServicePerformance(params?: DashboardFilters) {
  return apiRequest<{
    success: boolean
    message: string
    filters?: DashboardFilters
    services: ServicePerformanceRow[]
  }>(`/api/admin-panel/dashboard/service-performance/${dashboardQuery(params)}`)
}

export function fetchRequestFunnel(params?: DashboardFilters) {
  return apiRequest<{
    success: boolean
    message: string
    filters?: DashboardFilters
    funnel: FunnelStage[]
  }>(`/api/admin-panel/dashboard/funnel/${dashboardQuery(params)}`)
}

export function fetchCustomerAnalytics(params?: DashboardFilters) {
  return apiRequest<CustomerAnalyticsResponse>(
    `/api/admin-panel/dashboard/customer-analytics/${dashboardQuery(params)}`,
  )
}

export function fetchGeographicAnalytics(params?: DashboardFilters) {
  return apiRequest<{
    success: boolean
    message: string
    filters?: DashboardFilters
    locations?: GeographicLocation[]
    cities?: GeographicLocation[]
  }>(`/api/admin-panel/dashboard/geographic-analytics/${dashboardQuery(params)}`)
}

export function fetchPendingProviders() {
  return apiRequest<{ success: boolean; providers: AdminProvider[] }>(
    '/api/admin-panel/providers/pending/',
  ).then((res) => ({ ...res, providers: res.providers.map(normalizeAdminProvider) }))
}

export function fetchAllProviders() {
  return apiRequest<{ success: boolean; providers: AdminProvider[] }>(
    '/api/admin-panel/providers/',
  ).then((res) => ({ ...res, providers: res.providers.map(normalizeAdminProvider) }))
}

export function approveProvider(providerId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/approve/`,
    { method: 'POST' },
  )
}

export function rejectProvider(providerId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/reject/`,
    { method: 'POST', body: { reason } },
  )
}

export function activateProvider(providerId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/activate/`,
    { method: 'POST', body: { reason } },
  )
}

export function deactivateProvider(providerId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/deactivate/`,
    { method: 'POST', body: { reason } },
  )
}

export function verifyProvider(providerId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/verify/`,
    { method: 'POST', body: { reason } },
  )
}

export function unverifyProvider(providerId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/providers/${providerId}/unverify/`,
    { method: 'POST', body: { reason } },
  )
}

export function fetchAdminServices() {
  return apiRequest<{ success: boolean; services: ServiceCategory[] }>(
    '/api/admin-panel/services/',
  )
}

export function createAdminService(data: {
  name: string
  key: string
  description: string
  status?: string
  start_date?: string
  display_order?: number
  service_image?: File | null
}) {
  const formData = new FormData()
  formData.append('name', data.name)
  formData.append('key', data.key)
  formData.append('description', data.description)
  if (data.status) formData.append('status', data.status)
  if (data.start_date) formData.append('start_date', data.start_date)
  if (data.display_order != null) formData.append('display_order', String(data.display_order))
  if (data.service_image) formData.append('service_image', data.service_image)

  return apiRequest<{ success: boolean; message: string; service_id: number }>(
    '/api/admin-panel/services/create/',
    { method: 'POST', formData },
  )
}

export function updateAdminService(
  serviceId: number,
  data: Partial<{
    name: string
    key: string
    description: string
    status: string
    start_date: string
    display_order: number
    service_image: File | null
  }>,
) {
  const formData = new FormData()
  if (data.name != null) formData.append('name', data.name)
  if (data.description != null) formData.append('description', data.description)
  if (data.status != null) formData.append('status', data.status)
  if (data.start_date != null) formData.append('start_date', data.start_date)
  if (data.display_order != null) formData.append('display_order', String(data.display_order))
  if (data.service_image) formData.append('service_image', data.service_image)

  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/services/${serviceId}/update/`,
    { method: 'PATCH', formData },
  )
}

export function reorderAdminServices(order: number[]) {
  return apiRequest<{ success: boolean; message: string }>(
    '/api/admin-panel/services/reorder/',
    { method: 'POST', body: { order } },
  )
}

export function deleteAdminService(serviceId: number, reason: string) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/services/${serviceId}/delete/`,
    { method: 'DELETE', body: { reason } },
  )
}

export type AdminCustomer = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  phone: string
  address: string
  is_active: boolean
  is_email_verified: boolean
  profile_picture: string | null
  date_joined: string
  last_login?: string | null
}

export type AdminPermissions = {
  manage_providers: boolean
  manage_customers: boolean
  manage_services: boolean
  manage_bookings: boolean
  manage_quotes: boolean
  view_reports: boolean
  manage_spotlights: boolean
  manage_admin_users: boolean
}

export type AdminStaffUser = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  is_staff: boolean
  is_superuser: boolean
  is_active: boolean
  date_joined: string
  permissions: AdminPermissions
}

export function fetchAdminCustomers() {
  return apiRequest<{
    success: boolean
    customers: AdminCustomer[]
  }>('/api/admin-panel/customers/')
}

export function fetchAdminCustomerDetail(customerId: number) {
  return apiRequest<{ success: boolean; data: AdminCustomer }>(
    `/api/admin-panel/customers/${customerId}/`,
  )
}

export function updateAdminCustomer(
  customerId: number,
  data: Partial<{
    username: string
    email: string
    first_name: string
    last_name: string
    phone: string
    address: string
    profile_picture: File | null
  }>,
) {
  const formData = new FormData()
  if (data.username != null) formData.append('username', data.username)
  if (data.email != null) formData.append('email', data.email)
  if (data.first_name != null) formData.append('first_name', data.first_name)
  if (data.last_name != null) formData.append('last_name', data.last_name)
  if (data.phone != null) formData.append('phone', data.phone)
  if (data.address != null) formData.append('address', data.address)
  if (data.profile_picture) formData.append('profile_picture', data.profile_picture)

  return apiRequest<{ success: boolean; message: string; data: AdminCustomer }>(
    `/api/admin-panel/customers/${customerId}/update/`,
    { method: 'PATCH', formData },
  )
}

export function activateCustomer(customerId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/customers/${customerId}/activate/`,
    { method: 'POST' },
  )
}

export function deactivateCustomer(customerId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/customers/${customerId}/deactivate/`,
    { method: 'POST' },
  )
}

export type ProviderOperationalStatus = {
  has_provider_profile?: boolean
  profile_is_active?: boolean
  is_online: boolean
  is_available: boolean
  is_busy?: boolean
  marketplace_ready?: boolean
}

export type ProviderLocationStatus = {
  has_location?: boolean
  latitude: number | null
  longitude: number | null
  location_text?: string | null
  location_source?: string | null
  last_location_updated_at?: string | null
  live_location_is_fresh?: boolean
  live_location_is_stale?: boolean
  location_is_usable?: boolean
  service_radius_km?: number
  effective_radius_km?: number
}

export type MarketplaceMonitorSummary = {
  providers: {
    total: number
    approved: number
    online: number
    offline: number
    available: number
    busy: number
    marketplace_ready: number
    fresh_live_location: number
    stale_live_location: number
  }
  requests: {
    total: number
    pending: number
    area_selected: number
    quotation_received: number
    assigned: number
    in_progress: number
  }
  quotes: { total: number; pending: number; accepted: number }
  bookings: {
    total: number
    assigned: number
    pending: number
    in_progress: number
    completed_today: number
    cancelled_today: number
  }
}

export type MarketplaceMonitorProviderRow = {
  provider_id: number
  provider: string
  full_name?: string
  role: string
  account_status: { is_active: boolean; is_approved: boolean; is_verified: boolean }
  operational_status: ProviderOperationalStatus
  location: ProviderLocationStatus
  current_job?: unknown
  total_quotes: number
  accepted_quotes: number
  total_bookings: number
  completed_bookings: number
  cancelled_bookings: number
  average_rating: number
}

export type MarketplaceMonitorRequestRow = {
  id: number
  service_type?: string
  status?: string
  preferred_schedule?: { date: string | null; start_time: string | null; end_time: string | null }
  [key: string]: unknown
}

export type MarketplaceMonitorSections = 'summary' | 'requests' | 'bookings' | 'quotes' | 'providers'

export function fetchAdminMarketplaceMonitor(sections?: MarketplaceMonitorSections[]) {
  const query = sections?.length ? `?sections=${sections.join(',')}` : ''
  return apiRequest<{
    success: boolean
    message?: string
    location_settings?: {
      matching_enabled: boolean
      live_location_timeout_minutes: number
      maximum_provider_radius_km: number
    }
    data: {
      summary?: MarketplaceMonitorSummary
      requests?: MarketplaceMonitorRequestRow[]
      bookings?: AdminBooking[]
      quotes?: AdminQuote[]
      providers?: MarketplaceMonitorProviderRow[]
    }
  }>(`/api/admin-panel/marketplace/monitor/${query}`)
}

export function fetchAdminBookings() {
  return apiRequest<{ success: boolean; bookings: AdminBooking[] }>(
    '/api/admin-panel/bookings/',
  )
}

export function fetchAdminQuotes() {
  return apiRequest<{ success: boolean; quotes: AdminQuote[] }>(
    '/api/admin-panel/quotes/',
  )
}

export function fetchProviderPerformance(params?: DashboardFilters) {
  return apiRequest<{
    success: boolean
    message?: string
    count?: number
    providers: AdminProviderPerformance[]
  }>(`/api/admin-panel/provider-performance/${dashboardQuery(params)}`)
}

export type AdminSpotlight = {
  id: number
  title: string
  subtitle: string
  image: string | null
  image_url: string | null
  redirect_url: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export function fetchAdminSpotlights() {
  return apiRequest<{ success: boolean; count: number; data: AdminSpotlight[] }>(
    '/api/admin-panel/spotlights/',
  )
}

export function createAdminSpotlight(data: {
  title: string
  subtitle?: string
  redirect_url?: string
  display_order?: number
  is_active?: boolean
  image: File
}) {
  const formData = new FormData()
  formData.append('title', data.title)
  if (data.subtitle) formData.append('subtitle', data.subtitle)
  if (data.redirect_url) formData.append('redirect_url', data.redirect_url)
  if (data.display_order != null) formData.append('display_order', String(data.display_order))
  if (data.is_active != null) formData.append('is_active', String(data.is_active))
  formData.append('image', data.image)

  return apiRequest<{ success: boolean; message: string; data: AdminSpotlight }>(
    '/api/admin-panel/spotlights/create/',
    { method: 'POST', formData },
  )
}

export function updateAdminSpotlight(
  spotlightId: number,
  data: Partial<{
    title: string
    subtitle: string
    redirect_url: string
    display_order: number
    is_active: boolean
    image: File | null
  }>,
) {
  const formData = new FormData()
  if (data.title != null) formData.append('title', data.title)
  if (data.subtitle != null) formData.append('subtitle', data.subtitle)
  if (data.redirect_url != null) formData.append('redirect_url', data.redirect_url)
  if (data.display_order != null) formData.append('display_order', String(data.display_order))
  if (data.is_active != null) formData.append('is_active', String(data.is_active))
  if (data.image) formData.append('image', data.image)

  return apiRequest<{ success: boolean; message: string; data: AdminSpotlight }>(
    `/api/admin-panel/spotlights/${spotlightId}/update/`,
    { method: 'PATCH', formData },
  )
}

export function deleteAdminSpotlight(spotlightId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/spotlights/${spotlightId}/delete/`,
    { method: 'DELETE' },
  )
}

export function updateAdminProvider(
  providerId: number,
  data: Partial<{
    username: string
    email: string
    first_name: string
    last_name: string
    phone: string
    address: string
    bio: string
    experience_years: number | null
    profile_picture: File | null
  }>,
) {
  const formData = new FormData()
  if (data.username != null) formData.append('username', data.username)
  if (data.email != null) formData.append('email', data.email)
  if (data.first_name != null) formData.append('first_name', data.first_name)
  if (data.last_name != null) formData.append('last_name', data.last_name)
  if (data.phone != null) formData.append('phone', data.phone)
  if (data.address != null) formData.append('address', data.address)
  if (data.bio != null) formData.append('bio', data.bio)
  if (data.experience_years != null) {
    formData.append('experience_years', String(data.experience_years))
  } else if (data.experience_years === null && 'experience_years' in data) {
    formData.append('experience_years', '')
  }
  if (data.profile_picture) formData.append('profile_picture', data.profile_picture)

  return apiRequest<{ success: boolean; message: string; data: AdminProvider }>(
    `/api/admin-panel/providers/${providerId}/update/`,
    { method: 'PATCH', formData },
  )
}

export function fetchAdminUsers() {
  return apiRequest<{ success: boolean; count: number; data: AdminStaffUser[] }>(
    '/api/admin-panel/admin-users/',
  )
}

export function fetchAdminUserDetail(adminId: number) {
  return apiRequest<{ success: boolean; data: AdminStaffUser }>(
    `/api/admin-panel/admin-users/${adminId}/`,
  )
}

export function createAdminUser(data: {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
  permissions: AdminPermissions
}) {
  return apiRequest<{ success: boolean; message: string; data: AdminStaffUser }>(
    '/api/admin-panel/admin-users/create/',
    { method: 'POST', body: data },
  )
}

export function updateAdminUser(
  adminId: number,
  data: Partial<{
    email: string
    first_name: string
    last_name: string
    permissions: AdminPermissions
  }>,
) {
  return apiRequest<{ success: boolean; message: string; data: AdminStaffUser }>(
    `/api/admin-panel/admin-users/${adminId}/update/`,
    { method: 'PATCH', body: data },
  )
}

export function activateAdminUser(adminId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/admin-users/${adminId}/activate/`,
    { method: 'POST' },
  )
}

export function deactivateAdminUser(adminId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/admin-users/${adminId}/deactivate/`,
    { method: 'POST' },
  )
}

export function deleteAdminUser(adminId: number) {
  return apiRequest<{ success: boolean; message: string }>(
    `/api/admin-panel/admin-users/${adminId}/delete/`,
    { method: 'DELETE' },
  )
}

export type AdminProviderDetail = {
  provider: AdminProvider
  account_status: {
    is_email_verified: boolean
    is_approved: boolean
    is_verified: boolean
    is_active: boolean
    status_note: string
    deactivate_reason: string | null
  }
  operational_status: ProviderOperationalStatus
  location: ProviderLocationStatus & {
    live_location_timeout_minutes?: number
    admin_max_radius_km?: number
    effective_service_radius_km?: number
  }
  availability: {
    total_slots: number
    active_slots: number
    has_availability: boolean
    weekly_schedule: Record<
      string,
      { start_time: string; end_time: string; is_available: boolean }[]
    >
  }
  performance: {
    quotes: Record<string, number>
    bookings: Record<string, number>
    booking_value: { total: number; completed: number; average: number }
    reviews: { total: number; average_rating: number }
  }
  recent_bookings: Record<string, unknown>[]
  recent_reviews: Record<string, unknown>[]
}

export function fetchAdminProviderDetail(providerId: number) {
  return apiRequest<{ success: boolean; data: AdminProviderDetail }>(
    `/api/admin-panel/providers/${providerId}/`,
  )
}

export type AdminBooking = {
  id: number
  service_request_id: number
  service_type: string
  customer_id: number
  customer: string
  provider_id: number
  provider: string
  final_price: number
  status: string
  created_at: string
  updated_at: string
}

export type AdminQuote = {
  id: number
  service_request_id: number
  service_type: string
  customer: string
  provider_id: number
  provider: string
  price: number
  message: string
  status: string
  created_at: string
}

export type AdminProviderPerformance = {
  rank?: number
  provider_id: number
  provider: string
  full_name?: string
  email: string
  phone: string
  role: string
  is_active: boolean
  is_approved: boolean
  is_verified: boolean
  profile_picture: string | null
  operational_status?: ProviderOperationalStatus
  location?: ProviderLocationStatus
  total_quotes: number
  pending_quotes?: number
  accepted_quotes: number
  rejected_quotes?: number
  quotation_acceptance_rate?: number
  acceptance_rate: number
  total_bookings: number
  assigned_bookings?: number
  pending_bookings?: number
  in_progress_bookings?: number
  completed_bookings: number
  cancelled_bookings: number
  completion_rate: number
  cancellation_rate?: number
  total_booking_value?: number
  completed_booking_value?: number
  average_booking_value?: number
  total_reviews: number
  average_rating: number
  booking_value?: string | number
}
