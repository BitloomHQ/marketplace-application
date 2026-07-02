import { useEffect, useState } from 'react'
import { fetchProfile, fetchProviderLeads } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { ImagePreviewModal } from '../../components/ImagePreviewModal'
import { LeadDetailModal } from '../../components/LeadDetailModal'
import { SendQuoteModal } from '../../components/SendQuoteModal'
import { ListCardButton, ServiceListCard } from '../../components/ServiceListCard'
import { Alert, Button, EmptyState, PageHeader } from '../../components/ui'
import { providerDeactivationReason } from '../../lib/providerStatus'
import { isProviderRole } from '../../lib/format'
import { mapsUrlForLocation } from '../../lib/maps'
import type { Lead } from '../../types'

function LeadCard({
  lead,
  serviceType,
  quoted,
  onOpen,
  onSendQuote,
}: {
  lead: Lead
  serviceType: string
  quoted: boolean
  onOpen: () => void
  onSendQuote: () => void
}) {
  const canQuote = !quoted && lead.status !== 'cancelled'

  return (
    <ServiceListCard
      serviceType={serviceType}
      status={lead.status}
      rating={`Job #${lead.id}`}
      location={lead.address}
      locationHref={mapsUrlForLocation(lead.address, lead.lat, lead.lon)}
      description={lead.description ?? `Request from ${lead.customer}`}
      onClick={onOpen}
      actions={
        quoted ? (
          <span className="inline-flex min-w-[9.5rem] items-center justify-center rounded-full bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">
            Quote sent ✓
          </span>
        ) : canQuote ? (
          <ListCardButton onClick={onSendQuote}>Send quote</ListCardButton>
        ) : null
      }
    />
  )
}

function LeadSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5">
      <div className="flex gap-4">
        <div className="h-16 w-16 rounded-xl bg-zinc-200" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-40 rounded bg-zinc-200" />
          <div className="h-4 w-full rounded bg-zinc-200" />
          <div className="h-4 w-3/4 rounded bg-zinc-200" />
        </div>
      </div>
    </div>
  )
}

export function ProviderLeadsPage() {
  const { user, setUser } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [detailLeadId, setDetailLeadId] = useState<number | null>(null)
  const [quoteLead, setQuoteLead] = useState<Lead | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const serviceType = user && isProviderRole(user.role) ? user.role : 'plumber'
  const pendingApproval = user?.is_approved === false
  const deactivated = user?.is_active === false
  const deactivationReason = providerDeactivationReason(user)
  const canLoadLeads = !pendingApproval && !deactivated

  useEffect(() => {
    fetchProfile()
      .then((res) => setUser(res.user))
      .catch(() => {})
  }, [setUser])

  const load = (silent = false) => {
    if (!canLoadLeads) {
      setLeads([])
      setError('')
      setLoading(false)
      setRefreshing(false)
      return
    }

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
  }, [canLoadLeads])

  const handleQuoteSent = () => {
    load(true)
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-3">
        <PageHeader
          title="New jobs"
          subtitle={`${leads.length} nearby request${leads.length !== 1 ? 's' : ''} for you`}
        />
        <Button variant="secondary" disabled={loading || refreshing} onClick={() => load(true)}>
          {refreshing ? '…' : 'Refresh'}
        </Button>
      </div>

      {pendingApproval && (
        <div className="mb-4">
          <Alert variant="info">
            Your provider account is pending admin approval. Jobs will appear here after an admin
            verifies your account.
          </Alert>
        </div>
      )}

      {deactivated && (
        <div className="mb-4">
          <Alert variant="error">
            Your provider account is deactivated
            {deactivationReason ? `: ${deactivationReason}` : '.'}
          </Alert>
        </div>
      )}

      {error && canLoadLeads && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <LeadSkeleton />
          <LeadSkeleton />
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          icon="🔔"
          message={
            pendingApproval
              ? 'Waiting for admin verification before new jobs can be assigned to you.'
              : deactivated
                ? 'Your account is deactivated. Contact support if you think this is a mistake.'
                : "No new jobs right now. We'll notify you when a customer needs your service."
          }
        />
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              serviceType={serviceType}
              quoted={lead.has_quoted}
              onOpen={() => setDetailLeadId(lead.id)}
              onSendQuote={() => setQuoteLead(lead)}
            />
          ))}
        </div>
      )}

      <LeadDetailModal
        leadId={detailLeadId}
        serviceType={serviceType}
        open={detailLeadId !== null}
        onClose={() => setDetailLeadId(null)}
        onSendQuote={setQuoteLead}
        onImageClick={setPreviewImage}
      />

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
