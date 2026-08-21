import { Card } from '../ui'
import type { AdminDashboardData } from '../../api/admin'

type Segment = { label: string; value: number; color: string }

function DonutChart({ title, segments }: { title: string; segments: Segment[] }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <Card className="h-full">
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      {total === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500">No data yet</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative h-36 w-36 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#f4f4f5" strokeWidth="14" />
              {segments.map((segment) => {
                if (segment.value <= 0) return null
                const dash = (segment.value / total) * circumference
                const circle = (
                  <circle
                    key={segment.label}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth="14"
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="round"
                  />
                )
                offset += dash
                return circle
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-zinc-900">{total}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Total</span>
            </div>
          </div>
          <ul className="w-full space-y-2 sm:max-w-[10rem]">
            {segments.map((segment) => (
              <li key={segment.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2 text-zinc-600">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} />
                  {segment.label}
                </span>
                <span className="font-semibold tabular-nums text-zinc-900">{segment.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

function BarChart({ title, items }: { title: string; items: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <Card className="h-full">
      <p className="text-sm font-semibold text-zinc-900">{title}</p>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-600">{item.label}</span>
              <span className="font-bold tabular-nums text-zinc-900">{item.value}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function AdminDashboardCharts({ stats }: { stats: AdminDashboardData }) {
  const otherBookings = Math.max(
    0,
    stats.marketplace.total_bookings -
      stats.marketplace.completed_bookings -
      stats.marketplace.cancelled_bookings,
  )

  return (
    <section>
      <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">Analytics</h3>
      <div className="grid gap-4 lg:grid-cols-3">
        <DonutChart
          title="Booking outcomes"
          segments={[
            { label: 'Completed', value: stats.marketplace.completed_bookings, color: '#10b981' },
            { label: 'Cancelled', value: stats.marketplace.cancelled_bookings, color: '#f43f5e' },
            { label: 'In progress', value: otherBookings, color: '#8b5cf6' },
          ]}
        />
        <BarChart
          title="Customers"
          items={[
            { label: 'Active', value: stats.users.active_customers, color: '#8b5cf6' },
            { label: 'Inactive', value: stats.users.inactive_customers, color: '#d4d4d8' },
          ]}
        />
        <BarChart
          title="Providers"
          items={[
            { label: 'Active', value: stats.users.active_providers, color: '#10b981' },
            { label: 'Inactive', value: stats.users.inactive_providers, color: '#d4d4d8' },
            { label: 'Pending approval', value: stats.users.pending_providers, color: '#f59e0b' },
            { label: 'Verified', value: stats.users.verified_providers, color: '#3b82f6' },
          ]}
        />
        <div className="lg:col-span-2">
          <BarChart
            title="Service catalog"
            items={[
              { label: 'Active', value: stats.services.active_services, color: '#10b981' },
              { label: 'Coming soon', value: stats.services.coming_soon_services, color: '#f59e0b' },
              { label: 'Inactive', value: stats.services.inactive_services, color: '#a1a1aa' },
            ]}
          />
        </div>
        <BarChart
          title="Marketplace activity"
          items={[
            { label: 'Bookings', value: stats.marketplace.total_bookings, color: '#8b5cf6' },
            { label: 'Quotes', value: stats.marketplace.total_quotes, color: '#3b82f6' },
            { label: 'Reviews', value: stats.marketplace.total_reviews, color: '#f59e0b' },
          ]}
        />
      </div>
    </section>
  )
}
