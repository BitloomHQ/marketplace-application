import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchMyServiceRequests,
  updateBookingStatus,
  type ServiceRequestSummary,
} from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { CreateRequestModal } from '../../components/CreateRequestModal'
import { Alert, Badge, Button, EmptyState, Pagination } from '../../components/ui'
import { canCustomerCancelBooking } from '../../lib/bookingStatus'
import { formatService, formatStatus } from '../../lib/format'
import { SERVICE_META } from '../../lib/serviceMeta'

function statusTone(s: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (s === 'completed') return 'success'
  if (s === 'cancelled') return 'danger'
  if (s === 'in_progress' || s === 'assigned') return 'warning'
  return 'neutral'
}

function RequestCard({
  request: r,
  onCancel,
  cancelling,
}: {
  request: ServiceRequestSummary
  onCancel: (bookingId: number) => void
  cancelling: boolean
}) {
  const meta = SERVICE_META[r.service_type as keyof typeof SERVICE_META]
  const canCancel =
    r.booking_id != null && r.booking_status != null && canCustomerCancelBooking(r.booking_status)

  const quoteLabel =
    r.status === 'quotation_received' ? 'Compare quotes' : 'View quotes'

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${meta?.bg ?? 'bg-zinc-100'}`}
        >
          {meta?.emoji ?? '📋'}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-zinc-900">{formatService(r.service_type)}</h3>
          <p className="mt-1 truncate text-sm text-zinc-500">{r.address}</p>
          {r.description && (
            <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{r.description}</p>
          )}
          <p className="mt-2 text-xs text-zinc-400">
            {new Date(r.created_at).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge tone={statusTone(r.status)}>{formatStatus(r.status)}</Badge>

          {r.booking_id ? (
            <div className="flex flex-col items-stretch gap-1.5">
              <Link to="/customer/bookings">
                <Button variant="secondary" className="whitespace-nowrap px-3 py-1.5 text-xs">
                  View booking
                </Button>
              </Link>
              {canCancel && (
                <Button
                  variant="danger"
                  className="whitespace-nowrap px-3 py-1.5 text-xs"
                  disabled={cancelling}
                  onClick={() => onCancel(r.booking_id!)}
                >
                  {cancelling ? '…' : 'Cancel'}
                </Button>
              )}
            </div>
          ) : r.status !== 'cancelled' ? (
            <Link to={`/customer/quotes/${r.id}`}>
              <Button className="whitespace-nowrap px-3 py-1.5 text-xs">{quoteLabel}</Button>
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export function MyRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequestSummary[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const loadRequests = () => {
    setLoading(true)
    setError('')
    fetchMyServiceRequests(page, 10)
      .then((res) => {
        setRequests(res.requests)
        setTotalPages(res.total_pages)
        setTotal(res.total)
      })
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load requests'),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRequests()
  }, [page])

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Cancel this booking? The professional will be notified.')) return
    setActionId(`book-${bookingId}`)
    setError('')
    try {
      await updateBookingStatus({ booking_id: bookingId, status: 'cancelled' })
      loadRequests()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not cancel')
    } finally {
      setActionId(null)
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Your requests</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} booking request{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ New</Button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-200" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon="🏠"
          message="No requests yet. Book a service and pros near you will send quotes."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onCancel={handleCancelBooking}
              cancelling={actionId === `book-${r.booking_id}`}
            />
          ))}
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </div>
      )}

      <CreateRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => loadRequests()}
      />
    </div>
  )
}
