import { useEffect, useState } from 'react'
import { fetchMyBookings, updateBookingStatus } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { Alert, Badge, EmptyState, Select } from '../../components/ui'
import { canEditBookingStatus, providerStatusOptions } from '../../lib/bookingStatus'
import { formatService, formatStatus } from '../../lib/format'
import { SERVICE_META } from '../../lib/serviceMeta'
import type { Booking, BookingStatus } from '../../types'

function statusTone(s: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (s === 'completed') return 'success'
  if (s === 'cancelled') return 'danger'
  if (s === 'in_progress') return 'warning'
  return 'neutral'
}

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

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-zinc-900">My schedule</h1>
        <p className="mt-1 text-sm text-zinc-500">Update visit status for confirmed jobs</p>
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
        <EmptyState icon="📅" message="No confirmed jobs yet. Send quotes on new jobs to get booked." />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const meta = SERVICE_META[b.service_type]
            const editable = canEditBookingStatus(b.status)

            return (
              <article
                key={b.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${meta.bg}`}
                  >
                    {meta.emoji}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-zinc-900">{formatService(b.service_type)}</h3>
                    <p className="text-sm text-zinc-600">
                      For <span className="font-semibold">{b.customer}</span>
                    </p>
                    <p className="mt-1 text-lg font-bold text-zinc-900">₹{b.final_price}</p>
                  </div>

                  <div className="flex w-[6.75rem] shrink-0 flex-col items-end gap-2">
                    <Badge tone={statusTone(b.status)}>{formatStatus(b.status)}</Badge>

                    {editable ? (
                      <>
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
                          className="!w-full !rounded-lg !px-2 !py-1.5 text-xs font-medium"
                          aria-label="Change booking status"
                        >
                          {providerStatusOptions(b.status).map((s) => (
                            <option key={s} value={s}>
                              {formatStatus(s)}
                            </option>
                          ))}
                        </Select>
                        {updatingId === b.id && (
                          <p className="text-center text-[10px] text-zinc-400">Saving…</p>
                        )}
                      </>
                    ) : (
                      <p className="text-center text-[10px] text-zinc-400">Job closed</p>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
