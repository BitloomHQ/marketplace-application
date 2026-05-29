import { useEffect, useState } from 'react'
import { fetchProviderLeads } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { ImagePreviewModal } from '../../components/ImagePreviewModal'
import { SendQuoteModal } from '../../components/SendQuoteModal'
import { Alert, Badge, Button, EmptyState } from '../../components/ui'
import { formatStatus } from '../../lib/format'
import { resolveMediaUrl } from '../../lib/media'
import type { Lead } from '../../types'

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'pending') return 'warning'
  if (status === 'quotation_received') return 'neutral'
  return 'warning'
}

function LocationIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function LeadCard({
  lead,
  quoted,
  onSendQuote,
  onImageClick,
}: {
  lead: Lead
  quoted: boolean
  onSendQuote: () => void
  onImageClick: (src: string) => void
}) {
  const canQuote = !quoted && lead.status !== 'cancelled'

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
          {lead.customer.charAt(0).toUpperCase()}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
            Job #{lead.id}
          </p>
          <p className="mt-1 font-semibold text-zinc-900">{lead.customer}</p>
          <div className="mt-1 flex gap-1.5 text-sm text-zinc-600">
            <LocationIcon className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
            <span className="leading-relaxed">{lead.address}</span>
          </div>
          {lead.description && (
            <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{lead.description}</p>
          )}
          {lead.image && (() => {
            const src = resolveMediaUrl(lead.image)
            if (!src) return null
            return (
              <button
                type="button"
                onClick={() => onImageClick(src)}
                className="mt-2 inline-block overflow-hidden rounded-lg ring-1 ring-zinc-200 transition hover:ring-violet-300"
                aria-label="View job photo"
              >
                <img src={src} alt="Job photo" className="h-20 w-28 object-cover" />
              </button>
            )
          })()}
          {(lead.lawn_area ?? lead.area) != null && (
            <p className="mt-1 text-xs text-zinc-400">
              Lawn area: {lead.lawn_area ?? lead.area} m²
            </p>
          )}
          {lead.polygon_points && lead.polygon_points.length > 0 && (
            <p className="mt-1 text-xs text-violet-600">
              Lawn map: {lead.polygon_points.length} points marked
            </p>
          )}
          {lead.lat != null && lead.lon != null && (
            <a
              href={`https://www.google.com/maps?q=${lead.lat},${lead.lon}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-xs font-medium text-violet-600"
            >
              Open in Maps →
            </a>
          )}
        </div>

        <div className="flex w-[6.75rem] shrink-0 flex-col items-end gap-2">
          <Badge tone={statusTone(lead.status)}>{formatStatus(lead.status)}</Badge>
          {quoted ? (
            <span className="text-center text-xs font-medium text-emerald-600">Quote sent ✓</span>
          ) : canQuote ? (
            <Button className="w-full whitespace-nowrap px-3 py-1.5 text-xs" onClick={onSendQuote}>
              Send quote
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function LeadSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex gap-3">
        <div className="h-12 w-12 rounded-full bg-zinc-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 rounded bg-zinc-200" />
          <div className="h-4 w-32 rounded bg-zinc-200" />
          <div className="h-3 w-full rounded bg-zinc-200" />
        </div>
      </div>
    </div>
  )
}

export function ProviderLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [quoteLead, setQuoteLead] = useState<Lead | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const load = (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError('')
    fetchProviderLeads()
      .then((res) => setLeads(res.leads))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load leads'))
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }

  useEffect(() => {
    load()
  }, [])

  const handleQuoteSent = () => {
    load(true)
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">New jobs</h1>
          <p className="mt-1 text-sm text-zinc-500">Nearby requests for your skill</p>
        </div>
        <Button variant="secondary" disabled={loading || refreshing} onClick={() => load(true)}>
          {refreshing ? '…' : 'Refresh'}
        </Button>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {!loading && leads.length > 0 && (
        <p className="mb-4 text-sm text-zinc-500">
          <span className="font-bold text-violet-600">{leads.length}</span> job
          {leads.length !== 1 ? 's' : ''}
        </p>
      )}

      {loading ? (
        <div className="space-y-4">
          <LeadSkeleton />
          <LeadSkeleton />
        </div>
      ) : leads.length === 0 ? (
        <EmptyState icon="🔔" message="No new jobs right now. We'll notify you when a customer needs your service." />
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              quoted={lead.has_quoted}
              onSendQuote={() => setQuoteLead(lead)}
              onImageClick={setPreviewImage}
            />
          ))}
        </div>
      )}

      <SendQuoteModal
        lead={quoteLead}
        open={quoteLead !== null}
        onClose={() => setQuoteLead(null)}
        onSent={handleQuoteSent}
      />

      <ImagePreviewModal
        src={previewImage}
        alt="Job photo"
        open={previewImage !== null}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  )
}
