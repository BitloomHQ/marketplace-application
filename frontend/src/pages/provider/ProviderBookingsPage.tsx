import { useEffect, useState } from 'react'
import { fetchMyBookings, updateBookingStatus } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { RequestLawnMapSection } from '../../components/RequestLawnMapSection'
import {
  formatListDate,
  ServiceListCard,
} from '../../components/ServiceListCard'
import { Alert, EmptyState, PageHeader, Select } from '../../components/ui'
import { canEditBookingStatus, providerStatusOptions } from '../../lib/bookingStatus'
import { formatStatus } from '../../lib/format'
import { mapsUrlForLocation } from '../../lib/maps'
import type { Booking, BookingStatus } from '../../types'

export function ProviderBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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

  const activeCount = bookings.filter(
    (b) => b.status !== 'completed' && b.status !== 'cancelled',
  ).length

  return (
    <div>
      <PageHeader
        title="My schedule"
        subtitle={`${activeCount} active visit${activeCount !== 1 ? 's' : ''} on your calendar`}
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
        <EmptyState icon="📅" message="No confirmed jobs yet. Send quotes on new jobs to get booked." />
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => {
            const editable = canEditBookingStatus(b.status)

            return (
              <ServiceListCard
                key={b.id}
                serviceType={b.service_type}
                status={b.status}
                rating={`₹${b.final_price.toLocaleString()}`}
                date={formatListDate(b.created_at)}
                location={b.address}
                locationHref={mapsUrlForLocation(b.address, b.lat, b.lon)}
                description={`Visit for ${b.customer}`}
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
                  editable ? (
                    <div className="w-full min-w-[9.5rem] space-y-1.5">
                      <label className="sr-only" htmlFor={`status-${b.id}`}>
                        Change status
                      </label>
                      <Select
                        id={`status-${b.id}`}
                        value={b.status}
                        disabled={updatingId === b.id}
                        onChange={(e) =>
                          handleStatusChange(b.id, e.target.value as BookingStatus)
                        }
                        className="!w-full !rounded-full !px-4 !py-2.5 text-sm font-semibold"
                        aria-label="Change booking status"
                      >
                        {providerStatusOptions(b.status).map((s) => (
                          <option key={s} value={s}>
                            {formatStatus(s)}
                          </option>
                        ))}
                      </Select>
                      {updatingId === b.id && (
                        <p className="text-center text-xs text-zinc-400">Saving…</p>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex min-w-[9.5rem] items-center justify-center rounded-full bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-500">
                      Job closed
                    </span>
                  )
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
