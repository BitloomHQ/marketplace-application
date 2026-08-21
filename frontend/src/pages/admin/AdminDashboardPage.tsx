import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminDashboard } from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { AdminDashboardCharts } from '../../components/admin/AdminDashboardCharts'
import { Alert, Card } from '../../components/ui'
import { AdminStatsSkeleton } from '../../components/Shimmer'
import type { AdminDashboardData } from '../../api/admin'

type StatCardProps = {
  label: string
  value: number
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

function StatCard({ label, value, href, accent = 'default', hint }: StatCardProps) {
  const card = (
    <Card className={`h-full transition hover:shadow-md ${ACCENT_STYLES[accent]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${ACCENT_LABEL[accent]}`}>
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold tabular-nums ${ACCENT_VALUE[accent]}`}>{value}</p>
      {hint && <p className={`mt-1 text-xs ${ACCENT_LABEL[accent]}`}>{hint}</p>}
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

export function AdminDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    fetchAdminDashboard()
      .then((res) => setStats(res.data))
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load admin dashboard'),
      )
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 px-6 py-8 text-white shadow-lg shadow-violet-900/20">
        <p className="text-sm font-medium text-violet-200">Welcome back</p>
        <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
          {user?.username ? `Hi, ${user.username}` : 'Admin overview'}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-violet-100/90">
          Monitor users, services, and marketplace activity from one place. Use the sidebar to
          manage the platform.
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <AdminStatsSkeleton />
      ) : stats ? (
        <>
          <AdminDashboardCharts stats={stats} />

          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
              Users
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Pending providers"
                value={stats.users.pending_providers}
                href="/admin/pending-providers"
                accent="warning"
                hint="Review sign-ups →"
              />
              <StatCard
                label="Total customers"
                value={stats.users.total_customers}
                href="/admin/customers"
                accent="violet"
                hint="Manage accounts →"
              />
              <StatCard
                label="Active providers"
                value={stats.users.active_providers}
                href="/admin/providers"
              />
              <StatCard
                label="Verified providers"
                value={stats.users.verified_providers}
                href="/admin/providers"
                accent="success"
              />
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
              Services & marketplace
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Active services"
                value={stats.services.active_services}
                href="/admin/services"
              />
              <StatCard
                label="Coming soon"
                value={stats.services.coming_soon_services}
                href="/admin/services"
                accent="warning"
              />
              <StatCard
                label="Total bookings"
                value={stats.marketplace.total_bookings}
                href="/admin/marketplace"
              />
              <StatCard
                label="Completed"
                value={stats.marketplace.completed_bookings}
                href="/admin/marketplace"
                accent="success"
              />
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
              At a glance
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Total quotes" value={stats.marketplace.total_quotes} href="/admin/marketplace" />
              <StatCard label="Total reviews" value={stats.marketplace.total_reviews} href="/admin/marketplace" />
              <StatCard
                label="Cancelled bookings"
                value={stats.marketplace.cancelled_bookings}
                href="/admin/marketplace"
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
