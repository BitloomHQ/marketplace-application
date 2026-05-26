import { useEffect, useState } from 'react'
import { fetchMyBookings, updateBookingStatus } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { ReviewModal } from '../../components/ReviewModal'
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Select } from '../../components/ui'
import {
  canEditBookingStatus,
  customerStatusOptions,
} from '../../lib/bookingStatus'
import { formatService, formatStatus } from '../../lib/format'
import type { Booking, BookingStatus } from '../../types'

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
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load bookings'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleStatusChange = async (bookingId: number, status: BookingStatus) => {
    setUpdatingId(bookingId)
    setError('')
    try {
      await updateBookingStatus({ booking_id: bookingId, status })
      load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  const statusTone = (s: string) => {
    if (s === 'completed') return 'success' as const
    if (s === 'cancelled') return 'danger' as const
    if (s === 'in_progress') return 'warning' as const
    return 'neutral' as const
  }

  return (
    <div>
      <PageHeader
        title="My bookings"
        subtitle="Jobs where you selected a provider. Open service requests without a provider appear on your dashboard only."
      />
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : bookings.length === 0 ? (
        <EmptyState message="No bookings yet. Create a request and select a provider quote." />
      ) : (
        <div className="grid gap-4">
          {bookings.map((b) => (
            <Card key={b.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">
                    {formatService(b.service_type)} · #{b.id}
                  </h3>
                  <p className="text-sm text-slate-400">
                    Provider: <span className="text-slate-200">{b.provider}</span>
                  </p>
                  <p className="mt-1 text-lg font-bold text-violet-300">₹{b.final_price}</p>
                </div>
                <Badge tone={statusTone(b.status)}>{formatStatus(b.status)}</Badge>
              </div>

              {canEditBookingStatus(b.status) && (
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-4">
                  <label className="text-sm text-slate-400">Update status:</label>
                  <Select
                    value={b.status}
                    disabled={updatingId === b.id}
                    onChange={(e) => handleStatusChange(b.id, e.target.value as BookingStatus)}
                    className="max-w-xs"
                  >
                    {customerStatusOptions(b.status).map((s) => (
                      <option key={s} value={s}>
                        {formatStatus(s)}
                      </option>
                    ))}
                  </Select>
                  {updatingId === b.id && <span className="text-sm text-slate-500">Saving…</span>}
                </div>
              )}

              {b.status === 'completed' && !b.has_review && (
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <Button onClick={() => setReviewBooking(b)}>Add a review</Button>
                </div>
              )}
              {b.has_review && (
                <p className="mt-4 text-sm text-emerald-400 border-t border-slate-800 pt-4">
                  Review submitted
                </p>
              )}
            </Card>
          ))}
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
