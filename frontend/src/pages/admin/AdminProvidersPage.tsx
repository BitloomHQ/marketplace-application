import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  activateProvider,
  deactivateProvider,
  fetchAllProviders,
  unverifyProvider,
  verifyProvider,
  type AdminProvider,
} from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { AdminProviderEditModal } from '../../components/admin/AdminProviderEditModal'
import { AdminActiveStatusSelect } from '../../components/admin/AdminStatusSelect'
import { AdminActionButton, EditIcon } from '../../components/IconActionButton'
import { AdminListRowSkeleton } from '../../components/Shimmer'
import { Alert, Badge, Button, Card, PageHeader, Select } from '../../components/ui'
import { ADMIN_STATUS_REASON } from '../../lib/adminStatus'
import { providerDeactivationReason } from '../../lib/providerStatus'

export function AdminProvidersPage() {
  const [providers, setProviders] = useState<AdminProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [editing, setEditing] = useState<AdminProvider | null>(null)

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

  const changeActive = async (provider: AdminProvider, active: boolean) => {
    if (provider.is_active === active) return
    setBusyId(provider.id)
    setError('')
    try {
      if (active) await activateProvider(provider.id, ADMIN_STATUS_REASON)
      else await deactivateProvider(provider.id, ADMIN_STATUS_REASON)
      load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Status update failed')
    } finally {
      setBusyId(null)
    }
  }

  const changeVerified = async (provider: AdminProvider, verified: boolean) => {
    if (provider.is_verified === verified) return
    setBusyId(provider.id)
    setError('')
    try {
      if (verified) await verifyProvider(provider.id, ADMIN_STATUS_REASON)
      else await unverifyProvider(provider.id, ADMIN_STATUS_REASON)
      load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Verification update failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader subtitle="Manage provider accounts, status, and verification" />
        <Link to="/admin/pending-providers">
          <Button variant="secondary">Pending approvals</Button>
        </Link>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {loading ? (
        <AdminListRowSkeleton count={5} />
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
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone={p.is_approved ? 'success' : 'warning'}>
                        {p.is_approved ? 'Approved' : 'Pending approval'}
                      </Badge>
                      <Badge tone={p.is_active ? 'success' : 'danger'}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      {p.is_verified && <Badge tone="success">Verified</Badge>}
                    </div>
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
                  <div className="flex flex-wrap items-end gap-2">
                    {p.is_approved && (
                      <>
                        <div>
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Account</p>
                          <AdminActiveStatusSelect
                            value={p.is_active}
                            disabled={busyId === p.id}
                            onChange={(active) => changeActive(p, active)}
                          />
                        </div>
                        <div>
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">Verified</p>
                          <Select
                            value={p.is_verified ? 'verified' : 'unverified'}
                            disabled={busyId === p.id}
                            onChange={(e) => changeVerified(p, e.target.value === 'verified')}
                            className="min-w-[7.5rem] text-sm"
                          >
                            <option value="verified">Verified</option>
                            <option value="unverified">Unverified</option>
                          </Select>
                        </div>
                      </>
                    )}
                    <AdminActionButton
                      label="Edit"
                      variant="secondary"
                      disabled={busyId === p.id}
                      onClick={() => setEditing(p)}
                    >
                      <EditIcon />
                    </AdminActionButton>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <AdminProviderEditModal
        provider={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onUpdated={load}
      />
    </div>
  )
}
