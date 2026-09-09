import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchQuotes, selectProvider } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { ProviderAvatar } from '../../components/ProviderAvatar'
import { ProviderProfileModal } from '../../components/ProviderProfileModal'
import { StarRating } from '../../components/StarRating'
import { Alert, Badge, Button, EmptyState } from '../../components/ui'
import { ListCardSkeleton } from '../../components/Shimmer'
import { formatPreferredSchedule } from '../../lib/format'
import type { ProviderProfile, Quote } from '../../types'

function quoteStatusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'accepted') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}

function CheckShieldIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
}

function TagIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 11V6a3 3 0 013-3z" />
    </svg>
  )
}

function StarBadgeIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  )
}

function quoteToProfile(q: Quote): ProviderProfile {
  return {
    provider_id: q.provider_id,
    provider: q.provider,
    provider_email: q.provider_email,
    provider_phone: q.provider_phone,
    provider_address: q.provider_address,
    provider_role: q.provider_role,
    is_verified: q.is_verified,
    provider_profile_picture: q.provider_profile_picture,
    bio: q.bio,
    experience_years: q.experience_years,
    portfolio_images: q.portfolio_images,
    average_rating: q.average_rating,
    total_reviews: q.total_reviews,
  }
}

export function ViewQuotesPage() {
  const { requestId } = useParams<{ requestId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const id = Number(requestId)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectingId, setSelectingId] = useState<number | null>(null)
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null)
  const justCreated = (location.state as { created?: boolean })?.created

  const loadQuotes = useCallback(
    (silent = false) => {
      if (!id || Number.isNaN(id)) {
        setError('Invalid request')
        setLoading(false)
        return
      }
      if (!silent) setLoading(true)
      fetchQuotes(id)
        .then((res) => setQuotes(res.quotes))
        .catch((err) =>
          setError(err instanceof ApiRequestError ? err.message : 'Failed to load quotes'),
        )
        .finally(() => {
          if (!silent) setLoading(false)
        })
    },
    [id],
  )

  useEffect(() => {
    loadQuotes()
    const interval = setInterval(() => loadQuotes(true), 15000)
    return () => clearInterval(interval)
  }, [loadQuotes])

  const handleSelect = async (quoteId: number) => {
    setError('')
    setSuccess('')
    setSelectingId(quoteId)
    try {
      const res = await selectProvider({
        service_request_id: id,
        quote_id: quoteId,
      })
      const schedule = formatPreferredSchedule(
        res.schedule?.date,
        res.schedule?.start_time,
        res.schedule?.end_time,
      )
      setSuccess(schedule ? `Booked for ${schedule}.` : 'Booked! Your pro is confirmed.')
      setTimeout(() => navigate('/customer/bookings', { state: { bookingId: res.booking_id } }), 1200)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not book')
      // Provider may no longer be eligible/available — refresh instead of letting the UI go stale.
      loadQuotes(true)
    } finally {
      setSelectingId(null)
    }
  }

  return (
    <div>
      <Link to="/customer/requests" className="text-sm font-semibold text-violet-600">
        ← Back
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-zinc-900">Choose your pro</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {justCreated
          ? 'Request sent! Pros are sending quotes — check back in a moment.'
          : 'Compare prices, ratings, and book the best fit for you.'}
      </p>

      {justCreated && (
        <div className="mt-4">
          <Alert variant="success">Your request is live. Quotes usually arrive within minutes.</Alert>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mt-4">
          <Alert variant="success">{success}</Alert>
        </div>
      )}

      {loading ? (
        <div className="mt-6">
          <ListCardSkeleton count={2} />
        </div>
      ) : quotes.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="⏳" message="Waiting for quotes from nearby professionals…" />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {(() => {
            const pending = quotes.filter((q) => q.status === 'pending')
            const bestPriceId =
              pending.length > 1
                ? pending.reduce((min, q) => (q.price < min.price ? q : min), pending[0]).id
                : null
            const rated = quotes.filter((q) => q.total_reviews > 0)
            const topRatedId =
              rated.length > 1
                ? rated.reduce((best, q) => (q.average_rating > best.average_rating ? q : best), rated[0]).id
                : null

            return quotes.map((q) => {
              const isBestPrice = q.id === bestPriceId
              const isTopRated = q.id === topRatedId
              return (
                <article
                  key={q.id}
                  className={`rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_1px_1px_rgba(0,0,0,0.02)] transition-all duration-150 sm:p-5 ${
                    isBestPrice ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-zinc-200/80'
                  }`}
                >
                  {(isBestPrice || isTopRated) && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {isBestPrice && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                          <TagIcon /> Best price
                        </span>
                      )}
                      {isTopRated && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">
                          <StarBadgeIcon /> Top rated
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <ProviderAvatar name={q.provider} imageUrl={q.provider_profile_picture} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setProviderProfile(quoteToProfile(q))}
                              className="text-left font-bold text-zinc-900 underline-offset-2 hover:text-violet-600 hover:underline"
                            >
                              {q.provider}
                            </button>
                            {q.is_verified && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                                <CheckShieldIcon /> Verified
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <StarRating rating={q.average_rating} totalReviews={q.total_reviews} />
                          </div>
                          {q.experience_years != null && q.experience_years > 0 && (
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {q.experience_years} yr{q.experience_years !== 1 ? 's' : ''} experience
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <p
                            className={`text-3xl font-bold leading-none tracking-tight tabular-nums ${
                              isBestPrice ? 'text-emerald-700' : 'text-zinc-900'
                            }`}
                          >
                            ₹{q.price.toLocaleString('en-IN')}
                          </p>
                          <Badge tone={quoteStatusTone(q.status)} >{q.status}</Badge>
                        </div>
                      </div>

                      {q.message && (
                        <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-600">
                          {q.message}
                        </p>
                      )}

                      {q.status === 'pending' && (
                        <Button
                          className="mt-3 w-full sm:w-auto"
                          onClick={() => handleSelect(q.id)}
                          disabled={selectingId === q.id}
                        >
                          {selectingId === q.id ? 'Booking…' : 'Book this pro'}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })
          })()}
        </div>
      )}

      <Button variant="ghost" className="mt-4 w-full" onClick={() => loadQuotes()}>
        Refresh
      </Button>

      <ProviderProfileModal
        profile={providerProfile}
        open={providerProfile !== null}
        onClose={() => setProviderProfile(null)}
      />
    </div>
  )
}
