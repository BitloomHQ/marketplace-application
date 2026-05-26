import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyServiceRequests, updateBookingStatus } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { Alert, Badge, Button, Card, EmptyState, PageHeader, Pagination } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { canEditBookingStatus } from '../../lib/bookingStatus'
import { formatService, formatStatus } from '../../lib/format'
import type { BookingStatus } from '../../types'
import { SERVICE_IMAGES } from '../../lib/serviceImages'
import type { ServiceType } from '../../types'

type ServiceRequestRow = {
  id: number
  service_type: string
  address: string
  description: string | null
  status: string
  is_booked: boolean
  booking_id: number | null
  booking_status: string | null
  created_at: string
}

export function CustomerDashboard() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<ServiceRequestRow[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [bookedCount, setBookedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  const loadRequests = () => {
    setLoading(true)
    setError('')
    fetchMyServiceRequests(page, 10)
      .then((res) => {
        setRequests(res.requests)
        setTotalPages(res.pagination.total_pages)
        setTotal(res.pagination.total)
        setBookedCount(res.pagination.booked_count)
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
    if (!confirm('Cancel this booking? The provider will be notified.')) return
    setActionId(`book-${bookingId}`)
    setError('')
    try {
      await updateBookingStatus({ booking_id: bookingId, status: 'cancelled' })
      loadRequests()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not cancel booking')
    } finally {
      setActionId(null)
    }
  }

  const canCancelBooking = (r: ServiceRequestRow) =>
    r.booking_id != null &&
    r.booking_status != null &&
    canEditBookingStatus(r.booking_status as BookingStatus)

  const statusTone = (s: string) => {
    if (s === 'completed') return 'success' as const
    if (s === 'cancelled') return 'danger' as const
    if (s === 'in_progress' || s === 'assigned') return 'warning' as const
    return 'neutral' as const
  }

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.username ?? 'Customer'}`}
        subtitle="Book plumbers, electricians, or gardeners"
      />
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-white">New service request</h2>
          <p className="mt-2 text-sm text-slate-400">Describe your issue and get quotes from providers.</p>
          <Link to="/customer/create-request" className="mt-4 inline-block">
            <Button>Create request</Button>
          </Link>
        </Card>
        <Card>
          <h2 className="font-semibold text-white">My bookings</h2>
          <p className="mt-2 text-sm text-slate-400">
            Jobs where you selected a provider
            {bookedCount > 0 && (
              <span className="block mt-1 text-violet-300">{bookedCount} active booking{bookedCount !== 1 ? 's' : ''}</span>
            )}
          </p>
          <Link to="/customer/bookings" className="mt-4 inline-block">
            <Button variant="secondary">View bookings ({bookedCount})</Button>
          </Link>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold text-white">Your requested services</h2>
        <p className="mb-3 text-sm text-slate-400">
          All requests you posted ({total}). Bookings ({bookedCount}) appear after you pick a provider — open requests
          stay here until you choose a quote.
        </p>
        <Card className="overflow-hidden p-0">
          {loading ? (
            <p className="p-5 text-slate-400">Loading requests…</p>
          ) : requests.length === 0 ? (
            <div className="p-5">
              <EmptyState message="No service requests yet. Create your first request above." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Service</th>
                    <th className="px-4 py-3 font-medium">Address</th>
                    <th className="px-4 py-3 font-medium">Request status</th>
                    <th className="px-4 py-3 font-medium">Booking</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-slate-800/80 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-white">#{r.id}</td>
                      <td className="px-4 py-3 capitalize text-slate-300">{formatService(r.service_type)}</td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-slate-400" title={r.address}>
                        {r.address}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(r.status)}>{formatStatus(r.status)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {r.booking_id ? (
                          <span>
                            <span className="text-white">#{r.booking_id}</span>
                            {r.booking_status && (
                              <span className="ml-1 text-xs capitalize">({formatStatus(r.booking_status)})</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {r.booking_id ? (
                            <Link to="/customer/bookings">
                              <Button variant="secondary" className="py-1.5 text-xs">
                                View booking
                              </Button>
                            </Link>
                          ) : r.status !== 'cancelled' ? (
                            <Link to={`/customer/quotes/${r.id}`}>
                              <Button variant="secondary" className="py-1.5 text-xs">
                                View quotes
                              </Button>
                            </Link>
                          ) : null}
                          {canCancelBooking(r) && r.booking_id && (
                            <Button
                              variant="danger"
                              className="py-1.5 text-xs"
                              disabled={actionId === `book-${r.booking_id}`}
                              onClick={() => handleCancelBooking(r.booking_id!)}
                            >
                              {actionId === `book-${r.booking_id}` ? '…' : 'Cancel booking'}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-4 pb-4">
            <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          </div>
        </Card>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-white">Available services</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(['plumber', 'electrician', 'gardener'] as ServiceType[]).map((s) => (
            <Card key={s} className="overflow-hidden p-0">
              <img
                src={SERVICE_IMAGES[s]}
                alt={formatService(s)}
                className="h-40 w-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = `https://picsum.photos/seed/${s}/600/400`
                }}
              />
              <div className="p-4">
                <h3 className="font-semibold text-white">{formatService(s)}</h3>
                <p className="mt-1 text-sm text-slate-400">Book a trusted {s} near you</p>
                <Link to="/customer/create-request" state={{ serviceType: s }} className="mt-3 inline-block">
                  <Button variant="secondary" className="w-full">
                    Request {formatService(s)}
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
