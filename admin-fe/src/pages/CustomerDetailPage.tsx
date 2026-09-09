import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchAdminCustomerDetail, type AdminCustomerDetail } from '../api/admin'
import { ApiRequestError } from '../api/client'
import { AdminCustomerEditModal } from '../components/AdminCustomerEditModal'
import { AdminDetailPageSkeleton } from '../components/Shimmer'
import { Alert, Badge, Button, Card } from '../components/ui'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function addressTypeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const customerId = Number(id)
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    fetchAdminCustomerDetail(customerId)
      .then((res) => setCustomer(res.data))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load customer'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (Number.isFinite(customerId)) load()
  }, [customerId])

  return (
    <div className="space-y-6">
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700">
        ← Back to customers
      </Link>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <AdminDetailPageSkeleton />
      ) : customer ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-xl font-bold text-violet-700">
                {customer.profile_picture ? (
                  <img src={customer.profile_picture} alt="" className="h-full w-full object-cover" />
                ) : (
                  (customer.full_name || customer.username).charAt(0).toUpperCase()
                )}
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                  {customer.full_name || customer.username}
                </h1>
                <p className="mt-1 text-sm text-zinc-500">{customer.email}</p>
                {customer.phone && <p className="text-sm text-zinc-500">{customer.phone}</p>}
              </div>
            </div>
            <Button onClick={() => setEditOpen(true)}>Edit</Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge tone={customer.is_active ? 'success' : 'danger'}>
              {customer.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <Badge tone={customer.is_email_verified ? 'success' : 'warning'}>
              {customer.is_email_verified ? 'Email verified' : 'Email not verified'}
            </Badge>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">Address</h3>
            {customer.addresses.length === 0 ? (
              <Card>
                <p className="text-sm text-zinc-700">
                  {customer.address?.trim() || 'No address on file.'}
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {customer.addresses.map((address) => (
                  <Card key={address.id} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-zinc-900">{address.title || 'Untitled'}</p>
                      <Badge tone="neutral">{addressTypeLabel(address.address_type)}</Badge>
                      {address.is_default && <Badge tone="success">Default</Badge>}
                      <Badge tone="neutral">
                        {address.location_source === 'live' ? 'Live' : 'Manual'}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-700">{address.address}</p>
                    {(address.city || address.state || address.postal_code) && (
                      <p className="text-sm text-zinc-500">
                        {[address.city, address.state, address.postal_code].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {address.latitude != null && address.longitude != null && (
                      <p className="text-xs text-zinc-400">
                        {address.latitude.toFixed(5)}, {address.longitude.toFixed(5)}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Card>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-zinc-500">Account</h3>
            <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
              <p>Joined: {formatDateTime(customer.date_joined)}</p>
              <p>Last login: {formatDateTime(customer.last_login)}</p>
            </div>
          </Card>

          <AdminCustomerEditModal
            customer={customer}
            open={editOpen}
            onClose={() => setEditOpen(false)}
            onUpdated={load}
          />
        </>
      ) : (
        !error && <Card><p className="text-sm text-zinc-500">Customer not found.</p></Card>
      )}
    </div>
  )
}
