import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllProviders, type AdminProvider } from '../api/admin'
import { ApiRequestError } from '../api/client'
import { EyeIcon, IconLinkButton } from '../components/IconActionButton'
import { AdminListRowSkeleton } from '../components/Shimmer'
import { Alert, Badge, Button, Card, PageHeader } from '../components/ui'
import { providerDeactivationReason } from '../lib/providerStatus'

export function ProvidersPage() {
  const [providers, setProviders] = useState<AdminProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader subtitle="Manage provider accounts, status, and verification" />
        <Link to="/pending-providers">
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
                        <Link to="/pending-providers" className="font-semibold underline-offset-2 hover:underline">
                          review on Pending providers
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <IconLinkButton label="View details" to={`/providers/${p.id}`}>
                      <EyeIcon />
                    </IconLinkButton>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
