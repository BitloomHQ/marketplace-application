import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchAdminBookings,
  fetchAdminQuotes,
  fetchAdminRequests,
  fetchProviderPerformance,
} from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { Alert, Badge, Button, Card, PageHeader } from '../../components/ui'
import { formatStatus } from '../../lib/format'

type MonitorTab = 'requests' | 'bookings' | 'quotes' | 'performance'

const TABS: { id: MonitorTab; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'performance', label: 'Performance' },
]

function bookingStatusTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'pending' || status === 'assigned') return 'warning'
  return 'neutral'
}

export function AdminMarketplacePage() {
  const [tab, setTab] = useState<MonitorTab>('requests')
  const [requests, setRequests] = useState<Record<string, unknown>[]>([])
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([])
  const [quotes, setQuotes] = useState<Record<string, unknown>[]>([])
  const [performance, setPerformance] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchAdminRequests(),
      fetchAdminBookings(),
      fetchAdminQuotes(),
      fetchProviderPerformance(),
    ])
      .then(([reqRes, bookRes, quoteRes, perfRes]) => {
        setRequests(reqRes.requests)
        setBookings(bookRes.bookings)
        setQuotes(quoteRes.quotes)
        setPerformance(perfRes.providers)
      })
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load marketplace data'),
      )
      .finally(() => setLoading(false))
  }, [])

  const counts: Record<MonitorTab, number> = {
    requests: requests.length,
    bookings: bookings.length,
    quotes: quotes.length,
    performance: performance.length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Marketplace monitor" subtitle="Requests, bookings, quotes, and provider performance" />
        <Link to="/admin-dashboard">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5">
        {TABS.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
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

      {loading ? (
        <p className="text-zinc-400">Loading marketplace data…</p>
      ) : (
        <div className="space-y-2">
          {tab === 'requests' &&
            (requests.length === 0 ? (
              <Card className="text-center text-sm text-zinc-500">No service requests yet.</Card>
            ) : (
              requests.map((item) => (
                <Card key={String(item.id)}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        #{String(item.id)} · {String(item.service_type)} · {String(item.customer)}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">{String(item.address)}</p>
                      {item.description != null && String(item.description) && (
                        <p className="mt-1 text-sm text-zinc-600">{String(item.description)}</p>
                      )}
                    </div>
                    {item.status != null && (
                      <Badge tone="warning">{formatStatus(String(item.status))}</Badge>
                    )}
                  </div>
                </Card>
              ))
            ))}

          {tab === 'bookings' &&
            (bookings.length === 0 ? (
              <Card className="text-center text-sm text-zinc-500">No bookings yet.</Card>
            ) : (
              bookings.map((item) => (
                <Card key={String(item.id)}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        #{String(item.id)} · {String(item.customer)} → {String(item.provider)}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">{String(item.address ?? '')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-lg font-bold text-zinc-900">₹{String(item.final_price)}</p>
                      <Badge tone={bookingStatusTone(String(item.status))}>
                        {formatStatus(String(item.status))}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))
            ))}

          {tab === 'quotes' &&
            (quotes.length === 0 ? (
              <Card className="text-center text-sm text-zinc-500">No quotes yet.</Card>
            ) : (
              quotes.map((item) => (
                <Card key={String(item.id)}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-zinc-900">
                        #{String(item.id)} · {String(item.provider)}
                      </p>
                      {item.message != null && String(item.message) && (
                        <p className="mt-1 text-sm text-zinc-500">{String(item.message)}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-lg font-bold text-zinc-900">₹{String(item.price)}</p>
                      {item.status != null && (
                        <Badge tone="neutral">{formatStatus(String(item.status))}</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ))}

          {tab === 'performance' &&
            (performance.length === 0 ? (
              <Card className="text-center text-sm text-zinc-500">No provider data yet.</Card>
            ) : (
              performance.map((item) => (
                <Card key={String(item.provider_id)}>
                  <p className="font-semibold text-zinc-900">{String(item.provider)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="neutral">Quotes {String(item.total_quotes)}</Badge>
                    <Badge tone="success">Bookings {String(item.total_bookings)}</Badge>
                    <Badge tone="warning">Rating {String(item.average_rating)}</Badge>
                  </div>
                </Card>
              ))
            ))}
        </div>
      )}
    </div>
  )
}
