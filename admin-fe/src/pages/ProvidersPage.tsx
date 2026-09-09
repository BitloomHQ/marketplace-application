import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAllProviders, type AdminProvider } from '../api/admin'
import { ApiRequestError } from '../api/client'
import { EyeIcon, IconLinkButton } from '../components/IconActionButton'
import { AdminListRowSkeleton } from '../components/Shimmer'
import { SortControl, sortByKey, type SortDirection } from '../components/SortControl'
import { Alert, Badge, Button, Card, PageHeader } from '../components/ui'
import { providerDeactivationReason } from '../lib/providerStatus'

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'date_joined', label: 'Date joined' },
  { value: 'status', label: 'Status' },
  { value: 'verified', label: 'Verification' },
]

function extract(p: AdminProvider, key: string): string | number {
  if (key === 'name') return (p.full_name || p.username).toLowerCase()
  if (key === 'date_joined') return new Date(p.date_joined).getTime()
  if (key === 'status') return p.is_active ? 1 : 0
  if (key === 'verified') return p.is_verified ? 1 : 0
  return ''
}

function Avatar({ name, picture }: { name: string; picture?: string | null }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-100 text-sm font-bold text-violet-700 ring-1 ring-violet-200/70">
      {picture ? <img src={picture} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </span>
  )
}

export function ProvidersPage() {
  const [providers, setProviders] = useState<AdminProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState('date_joined')
  const [direction, setDirection] = useState<SortDirection>('desc')

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

  const sorted = useMemo(() => sortByKey(providers, sortKey, direction, extract), [providers, sortKey, direction])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader subtitle="Manage provider accounts, status, and verification" />
        <Link to="/pending-providers">
          <Button variant="secondary">Pending approvals</Button>
        </Link>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!loading && providers.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">{providers.length} providers</p>
          <SortControl
            options={SORT_OPTIONS}
            sortKey={sortKey}
            direction={direction}
            onChange={(key, dir) => {
              setSortKey(key)
              setDirection(dir)
            }}
          />
        </div>
      )}

      {loading ? (
        <AdminListRowSkeleton count={5} />
      ) : (
        <div className="space-y-3">
          {sorted.map((p) => {
            const deactivationReason = providerDeactivationReason(p)
            return (
              <Card key={p.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Avatar name={p.full_name || p.username} picture={p.profile_picture} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-zinc-900">{p.full_name || p.username}</p>
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
