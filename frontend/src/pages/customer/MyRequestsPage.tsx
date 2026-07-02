import { useEffect, useState } from 'react'
import {
  fetchMyServiceRequests,
  updateBookingStatus,
  type ServiceRequestSummary,
} from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { CreateRequestModal } from '../../components/CreateRequestModal'
import { ProviderProfileModal } from '../../components/ProviderProfileModal'
import { RequestLawnMapSection } from '../../components/RequestLawnMapSection'
import { StarRating } from '../../components/StarRating'
import {
  formatListDate,
  ListCardButton,
  ListCardLink,
  ServiceListCard,
} from '../../components/ServiceListCard'
import { mapsUrlForLocation } from '../../lib/maps'
import { Alert, Button, EmptyState, Pagination } from '../../components/ui'
import type { ProviderProfile } from '../../types'
import { canCustomerCancelBooking } from '../../lib/bookingStatus'

function toProviderProfile(r: ServiceRequestSummary): ProviderProfile | null {
  if (!r.provider_id || !r.provider) return null
  return {
    provider_id: r.provider_id,
    provider: r.provider,
    provider_email: r.provider_email ?? '',
    provider_phone: r.provider_phone,
    provider_address: r.provider_address,
    provider_role: r.provider_role ?? undefined,
    is_verified: r.is_verified ?? undefined,
    provider_profile_picture: r.provider_profile_picture,
    bio: r.bio,
    experience_years: r.experience_years,
    portfolio_images: r.portfolio_images,
    average_rating: r.average_rating ?? 0,
    total_reviews: r.total_reviews ?? 0,
  }
}

function displayStatus(r: ServiceRequestSummary): string {
  if (r.booking_status) return r.booking_status
  return r.status
}

function RequestCard({
  request: r,
  onCancel,
  cancelling,
  onProviderClick,
}: {
  request: ServiceRequestSummary
  onCancel: (bookingId: number) => void
  cancelling: boolean
  onProviderClick: (profile: ProviderProfile) => void
}) {
  const canCancel =
    r.booking_id != null && r.booking_status != null && canCustomerCancelBooking(r.booking_status)
  const providerProfile = toProviderProfile(r)
  const quoteLabel = r.status === 'quotation_received' ? 'Compare quotes' : 'View quotes'

  const rating =
    providerProfile && r.total_reviews ? (
      <StarRating rating={r.average_rating ?? 0} totalReviews={r.total_reviews ?? 0} />
    ) : null

  return (
    <ServiceListCard
      serviceType={r.service_type}
      status={displayStatus(r)}
      rating={rating}
      date={formatListDate(r.created_at)}
      location={r.address}
      locationHref={mapsUrlForLocation(r.address, r.lat, r.lon)}
      description={r.description ?? undefined}
      extra={
        <>
          <RequestLawnMapSection
            serviceType={r.service_type}
            lat={r.lat}
            lon={r.lon}
            lawnArea={r.lawn_area}
            polygonPoints={r.polygon_points}
          />
          {providerProfile && (
            <p className="text-sm text-zinc-600">
              Assigned to{' '}
              <button
                type="button"
                onClick={() => onProviderClick(providerProfile)}
                className="font-semibold text-sky-600 underline-offset-2 hover:underline"
              >
                {r.provider}
              </button>
            </p>
          )}
        </>
      }
      actions={
        <>
          {r.booking_id ? (
            <>
              <ListCardLink to="/customer/bookings" icon="calendar">
                View booking
              </ListCardLink>
              {canCancel && (
                <ListCardButton
                  variant="danger"
                  icon="cancel"
                  disabled={cancelling}
                  onClick={() => onCancel(r.booking_id!)}
                >
                  {cancelling ? 'Cancelling…' : 'Cancel'}
                </ListCardButton>
              )}
            </>
          ) : r.status !== 'cancelled' ? (
            <ListCardLink to={`/customer/quotes/${r.id}`} icon="calendar">
              {quoteLabel}
            </ListCardLink>
          ) : (
            <ListCardLink to="/customer/bookings" icon="calendar">
              View booking
            </ListCardLink>
          )}
        </>
      }
    />
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
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null)

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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Your requests</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {total} booking request{total !== 1 ? 's' : ''} for you
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
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-zinc-200" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          icon="🏠"
          message="No requests yet. Book a service and pros near you will send quotes."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onCancel={handleCancelBooking}
              cancelling={actionId === `book-${r.booking_id}`}
              onProviderClick={setProviderProfile}
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

      <ProviderProfileModal
        profile={providerProfile}
        open={providerProfile !== null}
        onClose={() => setProviderProfile(null)}
      />
    </div>
  )
}
