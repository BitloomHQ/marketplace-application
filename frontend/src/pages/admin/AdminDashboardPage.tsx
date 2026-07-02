import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminDashboard } from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { Alert, Button, Card, PageHeader } from '../../components/ui'
import type { AdminDashboardData } from '../../api/admin'

export function AdminDashboardPage() {
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
    <div className="space-y-6">
      <PageHeader title="Admin dashboard" subtitle="Platform overview and quick actions" />

      <div className="flex flex-wrap gap-3">
        <Link to="/admin/pending-providers">
          <Button variant="secondary">Pending providers</Button>
        </Link>
        <Link to="/admin/providers">
          <Button variant="secondary">Manage providers</Button>
        </Link>
        <Link to="/admin/services">
          <Button variant="secondary">Manage services</Button>
        </Link>
        <Link to="/admin/marketplace">
          <Button variant="secondary">Marketplace monitor</Button>
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <p className="text-zinc-400">Loading dashboard…</p>
      ) : stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/admin/pending-providers" className="block transition hover:opacity-90">
            <Card className="h-full border-amber-200 bg-amber-50/50 hover:border-amber-300">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                Pending providers
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-900">
                {stats.users.pending_providers}
              </p>
              <p className="mt-1 text-xs text-amber-700">Review and approve new sign-ups →</p>
            </Card>
          </Link>
          {[
            { label: 'Total customers', value: stats.users.total_customers },
            { label: 'Active services', value: stats.services.active_services, href: '/admin/services' },
            { label: 'Total bookings', value: stats.marketplace.total_bookings, href: '/admin/marketplace' },
            { label: 'Completed bookings', value: stats.marketplace.completed_bookings, href: '/admin/marketplace' },
            { label: 'Cancelled bookings', value: stats.marketplace.cancelled_bookings, href: '/admin/marketplace' },
          ].map(({ label, value, href }) => {
            const card = (
              <Card className="h-full">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{value}</p>
              </Card>
            )
            return href ? (
              <Link key={label} to={href} className="block transition hover:opacity-90">
                {card}
              </Link>
            ) : (
              <div key={label}>{card}</div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
