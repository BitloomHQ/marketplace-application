import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  activateProvider,
  deactivateProvider,
  fetchAllProviders,
  verifyProvider,
} from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import {
  AdminActionButton,
  BadgeCheckIcon,
  BanIcon,
  CheckIcon,
} from '../../components/IconActionButton'
import { ReasonActionModal } from '../../components/ReasonActionModal'
import { Alert, Button, Card, PageHeader } from '../../components/ui'
import { providerDeactivationReason } from '../../lib/providerStatus'
import type { AdminProvider } from '../../api/admin'

type ProviderAction = 'activate' | 'deactivate' | 'verify'

type PendingAction = {
  provider: AdminProvider
  action: ProviderAction
}

const ACTION_COPY: Record<ProviderAction, { title: string; confirmLabel: string }> = {
  activate: { title: 'Activate provider', confirmLabel: 'Activate' },
  deactivate: { title: 'Deactivate provider', confirmLabel: 'Deactivate' },
  verify: { title: 'Verify provider', confirmLabel: 'Verify' },
}

export function AdminProvidersPage() {
  const [providers, setProviders] = useState<AdminProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)

  const load = () => {
    setLoading(true)
    fetchAllProviders()
      .then((res) => setProviders(res.providers))
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load providers'),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const runWithReason = async (reason: string) => {
    if (!pending) return
    const { provider, action } = pending
    setBusyId(provider.id)
    setError('')
    try {
      if (action === 'activate') await activateProvider(provider.id, reason)
      if (action === 'deactivate') await deactivateProvider(provider.id, reason)
      if (action === 'verify') await verifyProvider(provider.id, reason)
      load()
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Action failed'
      setError(message)
      throw new Error(message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Provider management"
          subtitle="Activate, deactivate, and verify approved providers"
        />
        <div className="flex gap-2">
          <Link to="/admin/pending-providers">
            <Button variant="secondary">Pending approvals</Button>
          </Link>
          <Link to="/admin-dashboard">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {loading ? (
        <p className="text-zinc-400">Loading providers…</p>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => {
            const deactivationReason = providerDeactivationReason(p)
            return (
              <Card key={p.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-900">{p.username}</p>
                    <p className="text-sm text-zinc-500">
                      {p.email} · {p.role}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {p.is_approved ? 'Approved' : 'Pending'} · {p.is_active ? 'Active' : 'Inactive'} ·{' '}
                      {p.is_verified ? 'Verified' : 'Unverified'}
                    </p>
                    {!p.is_active && deactivationReason && (
                      <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                        <span className="font-semibold">Deactivation reason:</span> {deactivationReason}
                      </p>
                    )}
                    {!p.is_approved && (
                      <p className="mt-2 text-xs text-amber-700">
                        Awaiting approval —{' '}
                        <Link to="/admin/pending-providers" className="font-semibold underline-offset-2 hover:underline">
                          review on Pending providers
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!p.is_approved ? null : (
                      <>
                        {!p.is_active ? (
                          <AdminActionButton
                            label="Activate"
                            variant="success"
                            disabled={busyId === p.id}
                            onClick={() => setPending({ provider: p, action: 'activate' })}
                          >
                            <CheckIcon />
                          </AdminActionButton>
                        ) : (
                          <AdminActionButton
                            label="Deactivate"
                            variant="dangerSolid"
                            disabled={busyId === p.id}
                            onClick={() => setPending({ provider: p, action: 'deactivate' })}
                          >
                            <BanIcon />
                          </AdminActionButton>
                        )}
                        {!p.is_verified && (
                          <AdminActionButton
                            label="Verify"
                            variant="success"
                            disabled={busyId === p.id}
                            onClick={() => setPending({ provider: p, action: 'verify' })}
                          >
                            <BadgeCheckIcon />
                          </AdminActionButton>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <ReasonActionModal
        open={pending !== null}
        title={pending ? ACTION_COPY[pending.action].title : ''}
        subtitle={pending ? `Provider: ${pending.provider.username}` : undefined}
        confirmLabel={pending ? ACTION_COPY[pending.action].confirmLabel : 'Confirm'}
        onClose={() => setPending(null)}
        onConfirm={runWithReason}
      />
    </div>
  )
}
