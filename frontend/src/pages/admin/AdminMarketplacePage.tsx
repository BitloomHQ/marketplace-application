import { useEffect, useMemo, useState } from 'react'
import {
  fetchAdminMarketplaceMonitor,
  type AdminBooking,
  type AdminProviderPerformance,
  type AdminQuote,
} from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { AdminDataTable } from '../../components/admin/AdminDataTable'
import { Alert, Badge, Card, PageHeader } from '../../components/ui'
import { ListCardSkeleton } from '../../components/Shimmer'
import { formatService, formatStatus } from '../../lib/format'

type MonitorTab = 'bookings' | 'quotes' | 'performance'

const TABS: { id: MonitorTab; label: string; description: string }[] = [
  { id: 'bookings', label: 'Bookings', description: 'Confirmed jobs between customers and providers' },
  { id: 'quotes', label: 'Quotes', description: 'Price offers sent by providers on service requests' },
  { id: 'performance', label: 'Performance', description: 'Provider metrics and quality indicators' },
]

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function bookingStatusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'pending' || status === 'assigned' || status === 'in_progress') return 'warning'
  return 'neutral'
}

function quoteStatusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'accepted') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected' || status === 'declined') return 'danger'
  return 'neutral'
}

function SummaryCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="min-w-[8rem] flex-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
    </Card>
  )
}

export function AdminMarketplacePage() {
  const [tab, setTab] = useState<MonitorTab>('bookings')
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [quotes, setQuotes] = useState<AdminQuote[]>([])
  const [performance, setPerformance] = useState<AdminProviderPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')

    fetchAdminMarketplaceMonitor(['bookings'])
      .then((res) => {
        if (res.bookings) setBookings(res.bookings)
      })
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load marketplace data'),
      )
      .finally(() => setLoading(false))

    fetchAdminMarketplaceMonitor(['quotes', 'providers'])
      .then((res) => {
        if (res.quotes) setQuotes(res.quotes)
        if (res.providers) setPerformance(res.providers)
      })
      .catch(() => {})
  }, [])

  const ensureTabData = (nextTab: MonitorTab) => {
    setTab(nextTab)
    if (nextTab === 'quotes' && quotes.length === 0) {
      fetchAdminMarketplaceMonitor(['quotes'])
        .then((res) => {
          if (res.quotes) setQuotes(res.quotes)
        })
        .catch(() => {})
    }
    if (nextTab === 'performance' && performance.length === 0) {
      fetchAdminMarketplaceMonitor(['providers'])
        .then((res) => {
          if (res.providers) setPerformance(res.providers)
        })
        .catch(() => {})
    }
  }

  const counts: Record<MonitorTab, number> = {
    bookings: bookings.length,
    quotes: quotes.length,
    performance: performance.length,
  }

  const bookingSummary = useMemo(() => {
    const completed = bookings.filter((b) => b.status === 'completed').length
    const revenue = bookings.reduce((sum, b) => sum + Number(b.final_price || 0), 0)
    return { completed, revenue }
  }, [bookings])

  const quoteSummary = useMemo(() => {
    const accepted = quotes.filter((q) => q.status === 'accepted').length
    const pending = quotes.filter((q) => q.status === 'pending').length
    return { accepted, pending }
  }, [quotes])

  const activeTab = TABS.find((t) => t.id === tab)!

  return (
    <div className="space-y-6">
      <PageHeader subtitle="Bookings, quotes, and provider performance" />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5">
        {TABS.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => ensureTabData(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? 'bg-white text-violet-700 shadow-sm ring-1 ring-zinc-200'
                  : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900'
              }`}
            >
              {item.label}
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  active ? 'bg-violet-100 text-violet-700' : 'bg-zinc-200 text-zinc-600'
                }`}
              >
                {counts[item.id]}
              </span>
            </button>
          )
        })}
      </div>

      <p className="text-sm text-zinc-500">{activeTab.description}</p>

      {loading ? (
        <ListCardSkeleton count={4} />
      ) : (
        <>
          {tab === 'bookings' && (
            <>
              <div className="flex flex-wrap gap-3">
                <SummaryCard label="Total bookings" value={bookings.length} />
                <SummaryCard label="Completed" value={bookingSummary.completed} />
                <SummaryCard label="Total revenue" value={formatMoney(bookingSummary.revenue)} />
              </div>
              <AdminDataTable
                rows={bookings}
                rowKey={(row) => row.id}
                emptyMessage="No bookings yet."
                columns={[
                  {
                    key: 'id',
                    header: 'Booking',
                    render: (row) => (
                      <div>
                        <p className="font-semibold text-zinc-900">#{row.id}</p>
                        <p className="text-xs text-zinc-500">Request #{row.service_request_id}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'service',
                    header: 'Service',
                    render: (row) => (
                      <span className="font-medium text-zinc-800">{formatService(row.service_type)}</span>
                    ),
                  },
                  {
                    key: 'customer',
                    header: 'Customer',
                    render: (row) => <span>{row.customer}</span>,
                  },
                  {
                    key: 'provider',
                    header: 'Provider',
                    render: (row) => <span>{row.provider}</span>,
                  },
                  {
                    key: 'amount',
                    header: 'Amount',
                    className: 'text-right',
                    render: (row) => (
                      <span className="font-bold text-zinc-900">{formatMoney(row.final_price)}</span>
                    ),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => (
                      <Badge tone={bookingStatusTone(row.status)}>{formatStatus(row.status)}</Badge>
                    ),
                  },
                  {
                    key: 'date',
                    header: 'Created',
                    render: (row) => <span className="text-xs text-zinc-500">{formatDate(row.created_at)}</span>,
                  },
                ]}
              />
            </>
          )}

          {tab === 'quotes' && (
            <>
              <div className="flex flex-wrap gap-3">
                <SummaryCard label="Total quotes" value={quotes.length} />
                <SummaryCard label="Accepted" value={quoteSummary.accepted} />
                <SummaryCard label="Pending" value={quoteSummary.pending} />
              </div>
              <AdminDataTable
                rows={quotes}
                rowKey={(row) => row.id}
                emptyMessage="No quotes yet."
                columns={[
                  {
                    key: 'id',
                    header: 'Quote',
                    render: (row) => (
                      <div>
                        <p className="font-semibold text-zinc-900">#{row.id}</p>
                        <p className="text-xs text-zinc-500">Request #{row.service_request_id}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'service',
                    header: 'Service',
                    render: (row) => formatService(row.service_type),
                  },
                  {
                    key: 'customer',
                    header: 'Customer',
                    render: (row) => row.customer,
                  },
                  {
                    key: 'provider',
                    header: 'Provider',
                    render: (row) => row.provider,
                  },
                  {
                    key: 'price',
                    header: 'Price',
                    className: 'text-right',
                    render: (row) => <span className="font-bold text-zinc-900">{formatMoney(row.price)}</span>,
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => (
                      <Badge tone={quoteStatusTone(row.status)}>{formatStatus(row.status)}</Badge>
                    ),
                  },
                  {
                    key: 'message',
                    header: 'Message',
                    render: (row) => (
                      <span className="line-clamp-2 max-w-[12rem] text-xs text-zinc-500">
                        {row.message?.trim() || '—'}
                      </span>
                    ),
                  },
                  {
                    key: 'date',
                    header: 'Sent',
                    render: (row) => <span className="text-xs text-zinc-500">{formatDate(row.created_at)}</span>,
                  },
                ]}
              />
            </>
          )}

          {tab === 'performance' && (
            <>
              <div className="flex flex-wrap gap-3">
                <SummaryCard label="Providers tracked" value={performance.length} />
                <SummaryCard
                  label="Avg. rating"
                  value={
                    performance.length
                      ? (
                          performance.reduce((sum, p) => sum + p.average_rating, 0) / performance.length
                        ).toFixed(1)
                      : '—'
                  }
                />
              </div>
              <AdminDataTable
                rows={performance}
                rowKey={(row) => row.provider_id}
                emptyMessage="No provider data yet."
                columns={[
                  {
                    key: 'provider',
                    header: 'Provider',
                    render: (row) => (
                      <div>
                        <p className="font-semibold text-zinc-900">{row.provider}</p>
                        <p className="text-xs text-zinc-500">{row.email}</p>
                      </div>
                    ),
                  },
                  {
                    key: 'role',
                    header: 'Role',
                    render: (row) => formatService(row.role),
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (row) => (
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={row.is_active ? 'success' : 'danger'}>
                          {row.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {row.is_verified && <Badge tone="success">Verified</Badge>}
                        {!row.is_approved && <Badge tone="warning">Pending</Badge>}
                      </div>
                    ),
                  },
                  {
                    key: 'quotes',
                    header: 'Quotes',
                    className: 'text-center',
                    render: (row) => (
                      <div className="text-center">
                        <p className="font-bold text-zinc-900">{row.total_quotes}</p>
                        <p className="text-xs text-zinc-500">{row.acceptance_rate}% accepted</p>
                      </div>
                    ),
                  },
                  {
                    key: 'bookings',
                    header: 'Bookings',
                    className: 'text-center',
                    render: (row) => (
                      <div className="text-center">
                        <p className="font-bold text-zinc-900">{row.total_bookings}</p>
                        <p className="text-xs text-zinc-500">{row.completion_rate}% completed</p>
                      </div>
                    ),
                  },
                  {
                    key: 'rating',
                    header: 'Rating',
                    className: 'text-center',
                    render: (row) => (
                      <div className="text-center">
                        <p className="font-bold text-amber-600">{row.average_rating || '—'}</p>
                        <p className="text-xs text-zinc-500">{row.total_reviews} reviews</p>
                      </div>
                    ),
                  },
                ]}
              />
            </>
          )}
        </>
      )}
    </div>
  )
}
