import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { approveProvider, fetchPendingProviders, rejectProvider } from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { AdminActionButton, CheckIcon, XIcon } from '../../components/IconActionButton'
import { ReasonActionModal } from '../../components/ReasonActionModal'
import { Alert, Button, Card, EmptyState, PageHeader } from '../../components/ui'
import { formatService } from '../../lib/format'
import type { AdminProvider } from '../../api/admin'

function formatJoined(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function AdminPendingProvidersPage() {
  const [pending, setPending] = useState<AdminProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<number | null>(null)
  const [rejectTarget, setRejectTarget] = useState<AdminProvider | null>(null)

  const load = () => {
    setLoading(true)
    setError('')
    fetchPendingProviders()
      .then((res) => setPending(res.providers))
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load pending providers'),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleApprove = async (id: number) => {
    setActionId(id)
    setError('')
    try {
      await approveProvider(id)
      load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Approve failed')
    } finally {
      setActionId(null)
    }
  }

  const handleReject = async (reason: string) => {
    if (!rejectTarget) return
    setActionId(rejectTarget.id)
    setError('')
    try {
      await rejectProvider(rejectTarget.id, reason)
      setRejectTarget(null)
      load()
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Reject failed'
      setError(message)
      throw new Error(message)
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Pending providers"
          subtitle={`${pending.length} provider${pending.length !== 1 ? 's' : ''} waiting for approval`}
        />
        <Link to="/admin-dashboard">
          <Button variant="secondary">Back</Button>
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <p className="text-zinc-400">Loading pending providers…</p>
      ) : pending.length === 0 ? (
        <EmptyState
          icon="✓"
          message="No providers waiting for approval. New sign-ups will appear here."
        />
      ) : (
        <div className="space-y-3">
          {pending.map((provider) => (
            <Card key={provider.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-zinc-900">{provider.username}</p>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      Pending approval
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {provider.email} · {formatService(provider.role)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                    {provider.phone && <span>Phone: {provider.phone}</span>}
                    {provider.experience_years != null && (
                      <span>{provider.experience_years} years experience</span>
                    )}
                    {provider.date_joined && (
                      <span>Joined {formatJoined(provider.date_joined)}</span>
                    )}
                  </div>
                  {provider.bio && (
                    <p className="mt-2 text-sm text-zinc-600">{provider.bio}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminActionButton
                    label="Approve"
                    variant="success"
                    disabled={actionId === provider.id}
                    onClick={() => handleApprove(provider.id)}
                  >
                    <CheckIcon />
                  </AdminActionButton>
                  <AdminActionButton
                    label="Reject"
                    variant="dangerSolid"
                    disabled={actionId === provider.id}
                    onClick={() => setRejectTarget(provider)}
                  >
                    <XIcon />
                  </AdminActionButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ReasonActionModal
        open={rejectTarget !== null}
        title="Reject provider"
        subtitle={rejectTarget ? `Provider: ${rejectTarget.username}` : undefined}
        confirmLabel="Reject"
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />
    </div>
  )
}
