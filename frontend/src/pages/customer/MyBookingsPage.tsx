import { useEffect, useState } from 'react'
import { fetchMyBookings, updateBookingStatus } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { RequestLawnMapSection } from '../../components/RequestLawnMapSection'
import { ReviewModal } from '../../components/ReviewModal'
import {
  formatListDate,
  ListCardButton,
  ServiceListCard,
} from '../../components/ServiceListCard'
import { Alert, EmptyState, PageHeader } from '../../components/ui'
import { canCustomerCancelBooking } from '../../lib/bookingStatus'
import { mapsUrlForLocation } from '../../lib/maps'
import type { Booking } from '../../types'

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
      <PageHeader
        title="My bookings"
        subtitle={`${bookings.length} confirmed visit${bookings.length !== 1 ? 's' : ''} for you`}
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-200" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState icon="📅" message="No bookings yet. Pick a quote from your requests to confirm a pro." />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const canCancel = canCustomerCancelBooking(b.status)

            return (
              <ServiceListCard
                key={b.id}
                serviceType={b.service_type}
                status={b.status}
                rating={`₹${b.final_price.toLocaleString()}`}
                date={formatListDate(b.created_at)}
                location={b.address}
                locationHref={mapsUrlForLocation(b.address, b.lat, b.lon)}
                description={`Confirmed visit with ${b.provider}`}
                extra={
                  <RequestLawnMapSection
                    serviceType={b.service_type}
                    lat={b.lat}
                    lon={b.lon}
                    lawnArea={b.lawn_area}
                    polygonPoints={b.polygon_points}
                  />
                }
                actions={
                  <>
                    {canCancel && (
                      <ListCardButton
                        variant="danger"
                        icon="cancel"
                        disabled={updatingId === b.id}
                        onClick={() => handleCancel(b.id)}
                      >
                        {updatingId === b.id ? 'Cancelling…' : 'Cancel'}
                      </ListCardButton>
                    )}
                    {b.status === 'completed' && !b.has_review && (
                      <ListCardButton onClick={() => setReviewBooking(b)}>
                        Rate service
                      </ListCardButton>
                    )}
                    {b.has_review && (
                      <span className="inline-flex min-w-[9.5rem] items-center justify-center rounded-full bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
                        Reviewed ✓
                      </span>
                    )}
                  </>
                }
              />
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
