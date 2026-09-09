import { useEffect, useMemo, useState } from 'react'
import { fetchAdminCustomers, type AdminCustomer } from '../api/admin'
import { ApiRequestError } from '../api/client'
import { EyeIcon, IconLinkButton } from '../components/IconActionButton'
import { AdminListRowSkeleton } from '../components/Shimmer'
import { SortControl, sortByKey, type SortDirection } from '../components/SortControl'
import { Alert, Badge, Card, PageHeader } from '../components/ui'

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'date_joined', label: 'Date joined' },
  { value: 'status', label: 'Status' },
]

function extract(c: AdminCustomer, key: string): string | number {
  if (key === 'name') return (c.full_name || c.username).toLowerCase()
  if (key === 'date_joined') return new Date(c.date_joined).getTime()
  if (key === 'status') return c.is_active ? 1 : 0
  return ''
}

function Avatar({ name, picture }: { name: string; picture?: string | null }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-violet-100 text-sm font-bold text-violet-700 ring-1 ring-violet-200/70">
      {picture ? <img src={picture} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
    </span>
  )
}

export function CustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sortKey, setSortKey] = useState('date_joined')
  const [direction, setDirection] = useState<SortDirection>('desc')

  const load = () => {
    setLoading(true)
    fetchAdminCustomers()
      .then((res) => setCustomers(res.customers))
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load customers'),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const sorted = useMemo(() => sortByKey(customers, sortKey, direction, extract), [customers, sortKey, direction])

  return (
    <div className="space-y-6">
      <PageHeader subtitle="View, edit, and manage customer accounts" />

      {error && <Alert variant="error">{error}</Alert>}

      {!loading && customers.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">{customers.length} customers</p>
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
      ) : customers.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">No customers found.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((customer) => (
            <Card key={customer.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Avatar name={customer.full_name || customer.username} picture={customer.profile_picture} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-zinc-900">{customer.full_name || customer.username}</p>
                    <p className="text-sm text-zinc-500">
                      {customer.email} · @{customer.username}
                    </p>
                    {customer.phone && <p className="mt-1 text-xs text-zinc-500">{customer.phone}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge tone={customer.is_active ? 'success' : 'danger'}>
                        {customer.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge tone={customer.is_email_verified ? 'success' : 'neutral'}>
                        {customer.is_email_verified ? 'Email verified' : 'Email not verified'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <IconLinkButton label="View details" to={`/customers/${customer.id}`}>
                    <EyeIcon />
                  </IconLinkButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
