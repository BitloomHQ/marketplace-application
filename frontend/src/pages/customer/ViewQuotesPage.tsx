import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchQuotes, selectProvider } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { Alert, Badge, Button, EmptyState } from '../../components/ui'
import type { Quote } from '../../types'

function quoteStatusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'accepted') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
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
      setSuccess(`Booked! Your pro is confirmed.`)
      setTimeout(() => navigate('/customer/bookings', { state: { bookingId: res.booking_id } }), 1200)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not book')
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
          : 'Compare prices and book the best fit for you.'}
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
        <div className="mt-6 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-200" />
          ))}
        </div>
      ) : quotes.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon="⏳" message="Waiting for quotes from nearby professionals…" />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {quotes.map((q) => (
            <article
              key={q.id}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-700">
                  {q.provider.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-zinc-900">{q.provider}</h3>
                  <p className="mt-1 text-2xl font-bold text-zinc-900">₹{q.price}</p>
                  {q.message && <p className="mt-2 text-sm text-zinc-500">{q.message}</p>}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge tone={quoteStatusTone(q.status)}>{q.status}</Badge>
                  {q.status === 'pending' && (
                    <Button
                      className="whitespace-nowrap px-3 py-1.5 text-xs"
                      onClick={() => handleSelect(q.id)}
                      disabled={selectingId === q.id}
                    >
                      {selectingId === q.id ? 'Booking…' : 'Book this pro'}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Button variant="ghost" className="mt-4 w-full" onClick={() => loadQuotes()}>
        Refresh
      </Button>
    </div>
  )
}
