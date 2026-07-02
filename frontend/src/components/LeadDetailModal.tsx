import { useEffect, useState, type ReactNode } from 'react'
import { fetchLeadDetail } from '../api/services'
import { ApiRequestError } from '../api/client'
import { formatListDate } from './ServiceListCard'
import { LawnPolygonPreview } from './LawnPolygonPreview'
import { Alert, Badge, Button, Modal } from './ui'
import { formatService, formatStatus } from '../lib/format'
import { mapsUrlForLocation } from '../lib/maps'
import { resolveMediaUrl } from '../lib/media'
import type { Lead } from '../types'

type Props = {
  leadId: number | null
  serviceType: string
  open: boolean
  onClose: () => void
  onSendQuote: (lead: Lead) => void
  onImageClick?: (src: string) => void
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-zinc-800">{children}</dd>
    </div>
  )
}

function quoteStatusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'accepted') return 'success'
  if (status === 'rejected' || status === 'cancelled') return 'danger'
  if (status === 'pending') return 'warning'
  return 'neutral'
}

export function LeadDetailModal({
  leadId,
  serviceType,
  open,
  onClose,
  onSendQuote,
  onImageClick,
}: Props) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || leadId == null) {
      setLead(null)
      setError('')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    fetchLeadDetail(leadId)
      .then((res) => {
        if (!cancelled) setLead(res.lead)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : 'Failed to load job details')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, leadId])

  const lawnArea = lead?.lawn_area ?? lead?.area
  const mapsUrl = lead ? mapsUrlForLocation(lead.address, lead.lat, lead.lon) : null
  const imageSrc = lead?.image ? resolveMediaUrl(lead.image) : null
  const canQuote = lead && !lead.has_quoted && lead.status !== 'cancelled'
  const displayService = lead?.service_type ?? serviceType

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={lead ? `Job #${lead.id}` : 'Job details'}
      subtitle={lead ? `${formatService(displayService)} service request` : undefined}
      wide
      footer={
        lead && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            {canQuote && (
              <Button
                onClick={() => {
                  onSendQuote(lead)
                  onClose()
                }}
              >
                Send quote
              </Button>
            )}
          </div>
        )
      }
    >
      {loading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-5 w-32 rounded bg-zinc-200" />
          <div className="h-4 w-full rounded bg-zinc-200" />
          <div className="h-4 w-5/6 rounded bg-zinc-200" />
          <div className="h-28 w-full rounded-xl bg-zinc-200" />
        </div>
      )}

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {!loading && !error && lead && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="warning">{formatStatus(lead.status)}</Badge>
            {lead.is_booked && <Badge tone="success">Booked</Badge>}
            {lead.has_quoted && <Badge tone="success">Quote sent</Badge>}
          </div>

          <dl className="space-y-4">
            <DetailField label="Customer">{lead.customer}</DetailField>

            {lead.created_at && (
              <DetailField label="Posted">{formatListDate(lead.created_at)}</DetailField>
            )}

            <DetailField label="Address">
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-sky-600 underline-offset-2 hover:underline"
                >
                  {lead.address}
                </a>
              ) : (
                lead.address
              )}
            </DetailField>

            {lead.description && (
              <DetailField label="Description">
                <p className="whitespace-pre-wrap leading-relaxed">{lead.description}</p>
              </DetailField>
            )}

            {lawnArea != null && (
              <DetailField label="Lawn area">{lawnArea} m²</DetailField>
            )}
          </dl>

          {imageSrc && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Photo</p>
              <button
                type="button"
                onClick={() => onImageClick?.(imageSrc)}
                className="block w-full overflow-hidden rounded-xl ring-1 ring-zinc-200 transition hover:ring-sky-300"
                aria-label="View full photo"
              >
                <img src={imageSrc} alt="Job photo" className="max-h-72 w-full object-cover" />
              </button>
            </div>
          )}

          {lead.lat != null &&
            lead.lon != null &&
            lead.polygon_points &&
            lead.polygon_points.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Lawn map
                </p>
                <LawnPolygonPreview
                  centerLat={lead.lat}
                  centerLon={lead.lon}
                  polygonPoints={lead.polygon_points}
                  lawnArea={lawnArea}
                  title="Customer lawn area"
                />
              </div>
            )}

          {lead.my_quote && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-900">Your quote</p>
                <Badge tone={quoteStatusTone(lead.my_quote.status)}>
                  {formatStatus(lead.my_quote.status)}
                </Badge>
              </div>
              <p className="text-2xl font-bold text-zinc-900">₹{lead.my_quote.price.toLocaleString()}</p>
              {lead.my_quote.message && (
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{lead.my_quote.message}</p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
