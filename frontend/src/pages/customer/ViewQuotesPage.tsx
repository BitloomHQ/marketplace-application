import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchQuotes, selectProvider } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { Alert, Badge, Button, Card, EmptyState, PageHeader } from '../../components/ui'
import type { Quote } from '../../types'

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

  const loadQuotes = () => {
    if (!id || Number.isNaN(id)) {
      setError('Invalid request ID')
      setLoading(false)
      return
    }
    setLoading(true)
    fetchQuotes(id)
      .then((res) => setQuotes(res.quotes))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load quotes'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadQuotes()
  }, [id])

  const handleSelect = async (quoteId: number) => {
    setError('')
    setSuccess('')
    setSelectingId(quoteId)
    try {
      const res = await selectProvider({
        service_request_id: id,
        quote_id: quoteId,
      })
      setSuccess(`Booking confirmed! Booking #${res.booking_id}`)
      setTimeout(() => navigate('/customer/bookings'), 1500)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not select provider')
    } finally {
      setSelectingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title={`Quotes for request #${requestId}`}
        subtitle={justCreated ? 'Request created — waiting for provider quotes' : 'Compare quotes and select a provider'}
      />
      <div className="mb-4">
        <Link to="/customer-dashboard" className="text-sm text-violet-400 hover:text-violet-300">
          ← Back to dashboard
        </Link>
      </div>
      {justCreated && (
        <div className="mb-4">
          <Alert variant="success">Service request created successfully.</Alert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert variant="success">{success}</Alert>
        </div>
      )}
      {loading ? (
        <p className="text-slate-400">Loading quotes…</p>
      ) : quotes.length === 0 ? (
        <EmptyState message="No quotes yet. Providers will send quotes for your request." />
      ) : (
        <div className="grid gap-4">
          {quotes.map((q) => (
            <Card key={q.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{q.provider}</h3>
                  <Badge tone={q.status === 'accepted' ? 'success' : q.status === 'rejected' ? 'danger' : 'warning'}>
                    {q.status}
                  </Badge>
                </div>
                <p className="mt-1 text-2xl font-bold text-violet-300">₹{q.price}</p>
                {q.message && <p className="mt-2 text-sm text-slate-400">{q.message}</p>}
              </div>
              {q.status === 'pending' && (
                <Button onClick={() => handleSelect(q.id)} disabled={selectingId === q.id}>
                  {selectingId === q.id ? 'Selecting…' : 'Select provider'}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
      <div className="mt-4">
        <Button variant="ghost" onClick={loadQuotes}>
          Refresh quotes
        </Button>
      </div>
    </div>
  )
}
