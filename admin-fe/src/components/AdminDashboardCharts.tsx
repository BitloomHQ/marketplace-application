import { StatusDot } from './IconActionButton'
import { Card } from './ui'
import type {
  AdminDashboardData,
  CustomerAnalyticsResponse,
  DashboardTrendsResponse,
  FunnelStage,
  GeographicLocation,
  ServicePerformanceRow,
  AdminProviderPerformance,
} from '../api/admin'
import { AdminDataTable } from './AdminDataTable'

type Segment = { label: string; value: number; color: string }

function numSafe(value: string | number | undefined | null) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function formatMoney(value: string | number | undefined | null) {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return '₹0'
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function formatPercent(value: number | undefined | null) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

function formatStage(stage: string) {
  return stage.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

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

function TrendChart({ trends }: { trends: DashboardTrendsResponse | null }) {
  const labels = trends?.chart?.labels ?? []
  if (!trends || labels.length === 0) {
    return (
      <Card>
        <p className="text-sm font-semibold text-zinc-900">Booking & revenue trends</p>
        <p className="mt-8 text-center text-sm text-zinc-500">No trend data yet</p>
      </Card>
    )
  }

  const { booking_count, booking_value, completed_bookings, cancelled_bookings } = trends.chart
  const maxBookings = Math.max(...(booking_count ?? [0]), 1)
  const maxValue = Math.max(...(booking_value ?? [0]), 1)

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Booking & revenue trends</p>
          <p className="mt-1 text-xs text-zinc-500">
            {trends.summary?.total_bookings ?? 0} bookings · {formatMoney(trends.summary?.total_booking_value)}
            {trends.summary?.completion_rate != null && (
              <> · {formatPercent(trends.summary.completion_rate)} completed</>
            )}
            {trends.summary?.average_booking_value != null && trends.summary.average_booking_value > 0 && (
              <> · avg {formatMoney(trends.summary.average_booking_value)}</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-violet-500" /> Bookings
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Value
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> Completed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-400" /> Cancelled
          </span>
        </div>
      </div>

      <div className="mt-6 flex h-48 items-end gap-1.5 overflow-x-auto pb-1 sm:gap-2">
        {labels.map((label, index) => (
          <div key={`${label}-${index}`} className="flex min-w-[2.25rem] flex-1 flex-col items-center gap-2">
            <div className="flex h-36 w-full items-end justify-center gap-0.5">
              <div
                className="w-1.5 rounded-t bg-violet-500"
                style={{ height: `${(booking_count[index] / maxBookings) * 100}%`, minHeight: booking_count[index] ? 4 : 0 }}
                title={`${booking_count[index]} bookings`}
              />
              <div
                className="w-1.5 rounded-t bg-emerald-500"
                style={{ height: `${(booking_value[index] / maxValue) * 100}%`, minHeight: booking_value[index] ? 4 : 0 }}
                title={formatMoney(booking_value[index])}
              />
              <div
                className="w-1.5 rounded-t bg-sky-400"
                style={{
                  height: `${(completed_bookings[index] / maxBookings) * 100}%`,
                  minHeight: completed_bookings[index] ? 4 : 0,
                }}
                title={`${completed_bookings[index]} completed`}
              />
              <div
                className="w-1.5 rounded-t bg-rose-400"
                style={{
                  height: `${(cancelled_bookings[index] / maxBookings) * 100}%`,
                  minHeight: cancelled_bookings[index] ? 4 : 0,
                }}
                title={`${cancelled_bookings[index]} cancelled`}
              />
            </div>
            <span className="max-w-[3.5rem] truncate text-[10px] font-medium text-zinc-500">{label}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function FunnelChart({ funnel }: { funnel: FunnelStage[] }) {
  const stages = funnel ?? []
  const max = Math.max(...stages.map((s) => s.count), 1)

  return (
    <Card>
      <p className="text-sm font-semibold text-zinc-900">Request funnel</p>
      <p className="mt-1 text-xs text-zinc-500">Current operational pipeline by stage</p>
      <div className="mt-5 space-y-3">
        {stages.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">No funnel data yet</p>
        ) : (
          stages.map((stage) => (
            <div key={stage.stage}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-700">{formatStage(stage.stage)}</span>
                <span className="tabular-nums text-zinc-500">
                  {stage.count} · {formatPercent(stage.percentage ?? stage.overall_conversion_rate)}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-violet-600"
                  style={{ width: `${(stage.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

type Props = {
  stats: AdminDashboardData
  trends: DashboardTrendsResponse | null
  funnel: FunnelStage[]
  services: ServicePerformanceRow[]
  providers: AdminProviderPerformance[]
  customers: CustomerAnalyticsResponse | null
  locations: GeographicLocation[]
}

export function AdminDashboardCharts({
  stats,
  trends,
  funnel,
  services,
  providers,
  customers,
  locations,
}: Props) {
  const bookings = stats?.bookings
  const otherBookings = Math.max(
    0,
    numSafe(bookings?.total) - numSafe(bookings?.completed) - numSafe(bookings?.cancelled),
  )

  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">Trends & funnel</h3>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <TrendChart trends={trends} />
          </div>
          <FunnelChart funnel={funnel} />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">Snapshot charts</h3>
        <div className="grid gap-4 lg:grid-cols-3">
          <DonutChart
            title="Booking outcomes"
            segments={[
              { label: 'Completed', value: numSafe(stats.bookings?.completed), color: '#10b981' },
              { label: 'Cancelled', value: numSafe(stats.bookings?.cancelled), color: '#f43f5e' },
              { label: 'In progress', value: otherBookings, color: '#8b5cf6' },
            ]}
          />
          <DonutChart
            title="Customers"
            segments={[
              { label: 'Active', value: numSafe(stats.users?.customers?.active), color: '#8b5cf6' },
              { label: 'Inactive', value: numSafe(stats.users?.customers?.inactive), color: '#d4d4d8' },
            ]}
          />
          <DonutChart
            title="Providers"
            segments={[
              { label: 'Active', value: numSafe(stats.users?.providers?.active), color: '#10b981' },
              { label: 'Pending', value: numSafe(stats.users?.providers?.pending), color: '#f59e0b' },
              { label: 'Inactive', value: numSafe(stats.users?.providers?.inactive), color: '#d4d4d8' },
            ]}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
          Service performance
        </h3>
        <AdminDataTable
          rows={services ?? []}
          rowKey={(row) => row.service_id}
          emptyMessage="No service performance data yet."
          columns={[
            { key: 'service', header: 'Service', render: (row) => row.service },
            { key: 'requests', header: 'Requests', render: (row) => row.total_requests },
            { key: 'quotes', header: 'Quotes', render: (row) => row.total_quotations },
            { key: 'bookings', header: 'Bookings', render: (row) => row.total_bookings },
            { key: 'completed', header: 'Completed', render: (row) => row.completed_bookings },
            { key: 'cancelled', header: 'Cancelled', render: (row) => row.cancelled_bookings },
            { key: 'value', header: 'Booking value', render: (row) => formatMoney(row.booking_value) },
            { key: 'rating', header: 'Rating', render: (row) => Number(row.average_rating ?? 0).toFixed(1) },
            {
              key: 'conversion',
              header: 'Conversion',
              render: (row) => formatPercent(row.conversion_rate),
            },
          ]}
        />
      </section>

      <section>
        <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
          Provider leaderboard
        </h3>
        <AdminDataTable
          rows={(providers ?? []).slice(0, 10)}
          rowKey={(row) => row.provider_id}
          emptyMessage="No provider performance data yet."
          columns={[
            {
              key: 'rank',
              header: '#',
              render: (row) => row.rank ?? '—',
            },
            {
              key: 'provider',
              header: 'Provider',
              render: (row) => (
                <div>
                  <p className="font-medium text-zinc-900">
                    {row.full_name || row.provider}
                    {row.operational_status?.is_online && (
                      <span className="ml-1.5 inline-block align-middle" title="Online">
                        <StatusDot tone="success" />
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500">{row.role}</p>
                </div>
              ),
            },
            { key: 'quotes', header: 'Quotes', render: (row) => row.total_quotes },
            {
              key: 'acceptance',
              header: 'Accept %',
              render: (row) => formatPercent(row.acceptance_rate),
            },
            { key: 'bookings', header: 'Bookings', render: (row) => row.total_bookings },
            {
              key: 'completion',
              header: 'Complete %',
              render: (row) => formatPercent(row.completion_rate),
            },
            {
              key: 'rating',
              header: 'Rating',
              render: (row) => `${Number(row.average_rating ?? 0).toFixed(1)} (${row.total_reviews})`,
            },
            {
              key: 'value',
              header: 'Booking value',
              render: (row) => formatMoney(row.total_booking_value ?? row.booking_value),
            },
          ]}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
            Customer analytics
          </h3>
          {customers?.summary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ['New', customers.summary.new_customers],
                  ['Repeat', customers.summary.repeat_customers],
                  ['No bookings', customers.summary.customers_with_no_bookings],
                  ['Repeat rate', formatPercent(customers.summary.repeat_booking_rate)],
                  ['Active', customers.summary.active_customers],
                  ['Inactive', customers.summary.inactive_customers],
                ].map(([label, value]) => (
                  <Card key={String(label)} className="!p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                      {label}
                    </p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-zinc-900">{value}</p>
                  </Card>
                ))}
              </div>
              <AdminDataTable
                rows={customers.top_customers ?? []}
                rowKey={(row) => row.customer_id}
                emptyMessage="No top customers yet."
                columns={[
                  {
                    key: 'customer',
                    header: 'Customer',
                    render: (row) => (
                      <div>
                        <p className="font-medium text-zinc-900">{row.full_name || row.username}</p>
                        <p className="text-xs text-zinc-500">{row.email}</p>
                      </div>
                    ),
                  },
                  { key: 'bookings', header: 'Bookings', render: (row) => row.total_bookings },
                  { key: 'completed', header: 'Completed', render: (row) => row.completed_bookings },
                  { key: 'spend', header: 'Spend', render: (row) => formatMoney(row.total_spend) },
                ]}
              />
            </div>
          ) : (
            <Card>
              <p className="py-8 text-center text-sm text-zinc-500">No customer analytics yet</p>
            </Card>
          )}
        </div>

        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">
            Geographic demand
          </h3>
          <AdminDataTable
            rows={locations ?? []}
            rowKey={(row) => `${row.city}-${row.state}`}
            emptyMessage="No geographic data yet."
            columns={[
              {
                key: 'location',
                header: 'Location',
                render: (row) => (
                  <div>
                    <p className="font-medium text-zinc-900">{row.city}</p>
                    <p className="text-xs text-zinc-500">{row.state}</p>
                  </div>
                ),
              },
              { key: 'requests', header: 'Requests', render: (row) => row.total_requests },
              {
                key: 'services',
                header: 'Top services',
                render: (row) =>
                  row.services.length
                    ? row.services
                        .slice(0, 3)
                        .map((s) => `${s.service} (${s.requests})`)
                        .join(', ')
                    : '—',
              },
            ]}
          />
        </div>
      </section>
    </div>
  )
}
