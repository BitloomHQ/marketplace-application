import { useEffect, useState } from 'react'
import { fetchMyBookings, updateBookingStatus } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { ReviewModal } from '../../components/ReviewModal'
import { Alert, Badge, Button, EmptyState } from '../../components/ui'
import { canCustomerCancelBooking } from '../../lib/bookingStatus'
import { formatService, formatStatus } from '../../lib/format'
import { SERVICE_META } from '../../lib/serviceMeta'
import type { Booking } from '../../types'

function statusTone(s: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (s === 'completed') return 'success'
  if (s === 'cancelled') return 'danger'
  if (s === 'in_progress') return 'warning'
  return 'neutral'
}

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    fetchMyBookings()
      .then((res) => setBookings(res.bookings))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleCancel = async (bookingId: number) => {
    if (!confirm('Cancel this booking? The professional will be notified.')) return
    setUpdatingId(bookingId)
    setError('')
    try {
      await updateBookingStatus({ booking_id: bookingId, status: 'cancelled' })
      load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not cancel')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-zinc-900">My bookings</h1>
        <p className="mt-1 text-sm text-zinc-500">Track your confirmed home service visits</p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-zinc-200" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState icon="📅" message="No bookings yet. Pick a quote from your requests to confirm a pro." />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const meta = SERVICE_META[b.service_type]
            const canCancel = canCustomerCancelBooking(b.status)

            return (
              <article
                key={b.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${meta.bg}`}
                  >
                    {meta.emoji}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-zinc-900">{formatService(b.service_type)}</h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      with <span className="font-semibold">{b.provider}</span>
                    </p>
                    <p className="mt-2 text-xl font-bold text-zinc-900">₹{b.final_price}</p>
                  </div>

                  <div className="flex w-[6.75rem] shrink-0 flex-col items-end gap-2">
                    <Badge tone={statusTone(b.status)}>{formatStatus(b.status)}</Badge>

                    {canCancel && (
                      <Button
                        variant="danger"
                        className="w-full whitespace-nowrap px-3 py-1.5 text-xs"
                        disabled={updatingId === b.id}
                        onClick={() => handleCancel(b.id)}
                      >
                        {updatingId === b.id ? '…' : 'Cancel'}
                      </Button>
                    )}
                    {b.status === 'completed' && !b.has_review && (
                      <Button
                        className="w-full whitespace-nowrap px-3 py-1.5 text-xs"
                        onClick={() => setReviewBooking(b)}
                      >
                        Rate ★
                      </Button>
                    )}
                    {b.has_review && (
                      <span className="text-center text-[10px] font-medium leading-tight text-emerald-600">
                        Reviewed ✓
                      </span>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <ReviewModal
        booking={reviewBooking}
        open={reviewBooking !== null}
        onClose={() => setReviewBooking(null)}
        onSuccess={load}
      />
    </div>
  )
}
