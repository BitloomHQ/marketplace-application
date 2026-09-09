import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  loadAdminDashboardBundle,
  readAdminDashboardCache,
  type AdminDashboardData,
  type AdminProviderPerformance,
  type CustomerAnalyticsResponse,
  type DashboardPeriod,
  type DashboardTrendsResponse,
  type FunnelStage,
  type GeographicLocation,
  type ServicePerformanceRow,
} from '../api/admin'
import { ApiRequestError } from '../api/client'
import { useAdminAuth } from '../context/AdminAuthContext'
import { AdminDashboardCharts } from '../components/AdminDashboardCharts'
import { Alert, Card } from '../components/ui'
import { AdminStatsSkeleton } from '../components/Shimmer'

const PERIODS: { id: DashboardPeriod; label: string }[] = [
  { id: '7d', label: '7 Days' },
  { id: '30d', label: '30 Days' },
  { id: '6m', label: '6 Months' },
  { id: '1y', label: '1 Year' },
]

type StatCardProps = {
  label: string
  value: string | number
  href?: string
  accent?: 'default' | 'warning' | 'success' | 'violet'
  hint?: string
}

const ACCENT_STYLES = {
  default: 'border-zinc-200 bg-white',
  warning: 'border-amber-200 bg-amber-50/60',
  success: 'border-emerald-200 bg-emerald-50/60',
  violet: 'border-violet-200 bg-violet-50/60',
} as const

const ACCENT_LABEL = {
  default: 'text-zinc-500',
  warning: 'text-amber-700',
  success: 'text-emerald-700',
  violet: 'text-violet-700',
} as const

const ACCENT_VALUE = {
  default: 'text-zinc-900',
  warning: 'text-amber-900',
  success: 'text-emerald-900',
  violet: 'text-violet-900',
} as const

function formatMoney(value: string | number | undefined | null) {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return '₹0'
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function StatCard({ label, value, href, accent = 'default', hint }: StatCardProps) {
  const card = (
    <Card interactive={Boolean(href)} className={`h-full ${ACCENT_STYLES[accent]}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wider ${ACCENT_LABEL[accent]}`}>
        {label}
      </p>
      <p className={`mt-2.5 text-[2rem] font-bold leading-none tracking-tight tabular-nums ${ACCENT_VALUE[accent]}`}>
        {value}
      </p>
      {hint && <p className={`mt-2 text-xs ${ACCENT_LABEL[accent]}`}>{hint}</p>}
    </Card>
  )

  if (href) {
    return (
      <Link to={href} className="block">
        {card}
      </Link>
    )
  }
  return card
}

export function DashboardPage() {
  const { admin } = useAdminAuth()
  const [period, setPeriod] = useState<DashboardPeriod>('30d')
  const [stats, setStats] = useState<AdminDashboardData | null>(() => {
    return readAdminDashboardCache('30d')?.stats ?? null
  })
  const [trends, setTrends] = useState<DashboardTrendsResponse | null>(() => {
    return readAdminDashboardCache('30d')?.trends ?? null
  })
  const [funnel, setFunnel] = useState<FunnelStage[]>(() => {
    return readAdminDashboardCache('30d')?.funnel ?? []
  })
  const [services, setServices] = useState<ServicePerformanceRow[]>(() => {
    return readAdminDashboardCache('30d')?.services ?? []
  })
  const [providers, setProviders] = useState<AdminProviderPerformance[]>(() => {
    return readAdminDashboardCache('30d')?.providers ?? []
  })
  const [customers, setCustomers] = useState<CustomerAnalyticsResponse | null>(() => {
    return readAdminDashboardCache('30d')?.customers ?? null
  })
  const [locations, setLocations] = useState<GeographicLocation[]>(() => {
    return readAdminDashboardCache('30d')?.locations ?? []
  })
  const [loading, setLoading] = useState(() => !readAdminDashboardCache('30d'))
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const cached = readAdminDashboardCache(period)
    if (cached) {
      setStats(cached.stats)
      setTrends(cached.trends)
      setServices(cached.services)
      setFunnel(cached.funnel)
      setProviders(cached.providers)
      setCustomers(cached.customers)
      setLocations(cached.locations)
      setLoading(false)
      setError('')
      return () => {
        cancelled = true
      }
    }

    setLoading(true)
    setError('')

    loadAdminDashboardBundle(period)
      .then((bundle) => {
        if (cancelled) return
        setStats(bundle.stats)
        setTrends(bundle.trends)
        setServices(bundle.services)
        setFunnel(bundle.funnel)
        setProviders(bundle.providers)
        setCustomers(bundle.customers)
        setLocations(bundle.locations)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load admin dashboard')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [period])

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 px-6 py-8 text-white shadow-lg shadow-black/20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-violet-600/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
        </div>
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-violet-200">Welcome back</p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
              {admin?.username ? `Hi, ${admin.username}` : 'Admin overview'}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-violet-100/90">
              Production analytics for users, services, bookings, funnel health, and geographic demand.
            </p>
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-white/10 p-1 backdrop-blur">
            {PERIODS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  period === item.id
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-violet-100 hover:bg-white/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <AdminStatsSkeleton />
      ) : stats ? (
        <>
          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">KPI overview</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Pending providers"
                value={stats.users.providers.pending_approvals ?? stats.users.providers.pending}
                href="/pending-providers"
                accent="warning"
                hint="Review sign-ups →"
              />
              <StatCard
                label="Total customers"
                value={stats.users.customers.total}
                href="/customers"
                accent="violet"
                hint={`${stats.users.customers.active} active`}
              />
              <StatCard
                label="Active providers"
                value={stats.users.providers.active}
                href="/providers"
                hint={`${stats.users.providers.verified} verified`}
              />
              <StatCard
                label="Avg provider rating"
                value={Number(stats.reviews.average_provider_rating ?? 0).toFixed(1)}
                accent="success"
                hint={`${stats.reviews.total} reviews`}
              />
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
              Marketplace activity
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Requests today" value={stats.requests.today} hint={`${stats.requests.this_week} this week`} />
              <StatCard label="Requests this month" value={stats.requests.this_month} hint={`${stats.requests.total} total`} />
              <StatCard label="Quotations" value={stats.quotations.total} href="/marketplace" />
              <StatCard
                label="Booking value"
                value={formatMoney(stats.bookings.total_booking_value)}
                href="/marketplace"
                accent="violet"
                hint={`Avg ${formatMoney(stats.bookings.average_booking_value)}`}
              />
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
              Services & bookings
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Active services"
                value={stats.services.active}
                href="/services"
                hint={`${stats.services.popular} popular`}
              />
              <StatCard
                label="Coming soon"
                value={stats.services.coming_soon}
                href="/services"
                accent="warning"
              />
              <StatCard
                label="Completed bookings"
                value={stats.bookings.completed}
                href="/marketplace"
                accent="success"
                hint={`${Number(stats.bookings.completion_rate ?? 0).toFixed(1)}% completion`}
              />
              <StatCard
                label="Cancelled bookings"
                value={stats.bookings.cancelled}
                href="/marketplace"
                hint={`${Number(stats.bookings.cancellation_rate ?? 0).toFixed(1)}% cancellation`}
              />
            </div>
          </section>

          <AdminDashboardCharts
            stats={stats}
            trends={trends}
            funnel={funnel}
            services={services}
            providers={providers}
            customers={customers}
            locations={locations}
          />
        </>
      ) : null}
    </div>
  )
}
