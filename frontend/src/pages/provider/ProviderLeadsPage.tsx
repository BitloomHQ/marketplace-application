import { useEffect, useState, type FormEvent } from 'react'
import { fetchProviderLeads, sendQuote } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { Alert, Badge, Button, Card, EmptyState, Field, Input, PageHeader, Textarea } from '../../components/ui'
import { formatStatus } from '../../lib/format'
import type { Lead } from '../../types'

function QuoteForm({ lead, onSent }: { lead: Lead; onSent: () => void }) {
  const [price, setPrice] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await sendQuote({
        service_request_id: lead.id,
        price: Number(price),
        message: message || undefined,
      })
      setSuccess(`Quote #${res.quote_id} sent`)
      setPrice('')
      setMessage('')
      onSent()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to send quote')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-slate-800 pt-4">
      <p className="text-sm font-medium text-violet-300">Send quote</p>
      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Price (₹)">
          <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} required />
        </Field>
        <Field label="Message">
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="I can fix it today" />
        </Field>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Sending…' : 'Send quote'}
      </Button>
    </form>
  )
}

export function ProviderLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    fetchProviderLeads()
      .then((res) => setLeads(res.leads))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load leads'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <PageHeader title="Provider leads" subtitle="Open service requests matching your role" />
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <div className="mb-4">
        <Button variant="ghost" onClick={load}>
          Refresh
        </Button>
      </div>
      {loading ? (
        <p className="text-slate-400">Loading leads…</p>
      ) : leads.length === 0 ? (
        <EmptyState message="No open leads right now. Check back when customers post requests." />
      ) : (
        <div className="grid gap-4">
          {leads.map((lead) => (
            <Card key={lead.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-white">Request #{lead.id}</h3>
                  <p className="text-sm text-slate-400">Customer: {lead.customer}</p>
                </div>
                <Badge>{formatStatus(lead.status)}</Badge>
              </div>
              <p className="mt-2 text-slate-300">{lead.address}</p>
              {lead.description && <p className="mt-1 text-sm text-slate-400">{lead.description}</p>}
              {lead.image && (
                <img
                  src={lead.image}
                  alt="Request"
                  className="mt-3 max-h-40 rounded-lg border border-slate-700"
                />
              )}
              <QuoteForm lead={lead} onSent={load} />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
