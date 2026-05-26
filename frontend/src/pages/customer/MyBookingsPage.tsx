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
            return (
              <article
                key={b.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
              >
                <div className="flex gap-4 p-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${meta.bg}`}>
                    {meta.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-zinc-900">{formatService(b.service_type)}</h3>
                      <Badge tone={statusTone(b.status)}>{formatStatus(b.status)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-zinc-600">
                      with <span className="font-semibold">{b.provider}</span>
                    </p>
                    <p className="mt-2 text-xl font-bold text-zinc-900">₹{b.final_price}</p>
                  </div>
                </div>

                <div className="border-t border-zinc-100 bg-zinc-50/80 px-4 py-3">
                  {canCustomerCancelBooking(b.status) && (
                    <Button
                      variant="danger"
                      className="w-full py-2 text-xs"
                      disabled={updatingId === b.id}
                      onClick={() => handleCancel(b.id)}
                    >
                      {updatingId === b.id ? 'Cancelling…' : 'Cancel booking'}
                    </Button>
                  )}
                  {b.status === 'completed' && !b.has_review && (
                    <Button className="mt-2 w-full py-2 text-xs" onClick={() => setReviewBooking(b)}>
                      Rate your experience ★
                    </Button>
                  )}
                  {b.has_review && (
                    <p className="text-center text-sm font-medium text-emerald-600">Thanks for your review!</p>
                  )}
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
