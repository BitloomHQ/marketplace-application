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

function BackArrowIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">{title}</h3>
      {children}
    </Card>
  )
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
        <BackArrowIcon />
        Back to customers
      </Link>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <AdminDetailPageSkeleton />
      ) : customer ? (
        <>
          <Card className="!p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-violet-100 text-xl font-bold text-violet-700 ring-1 ring-violet-200/70">
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
                  <p className="mt-1 text-sm text-zinc-500">
                    {customer.email}
                    {customer.phone && ` · ${customer.phone}`}
                  </p>
                </div>
              </div>
              <Button onClick={() => setEditOpen(true)}>Edit customer</Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-zinc-100 pt-4">
              <Badge tone={customer.is_active ? 'success' : 'danger'}>
                {customer.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge tone={customer.is_email_verified ? 'success' : 'warning'}>
                {customer.is_email_verified ? 'Email verified' : 'Email not verified'}
              </Badge>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
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

            <div className="space-y-6">
              <SectionCard title="Account">
                <div className="space-y-3 text-sm text-zinc-700">
                  <div>
                    <p className="text-xs text-zinc-400">Joined</p>
                    <p className="font-medium">{formatDateTime(customer.date_joined)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Last login</p>
                    <p className="font-medium">{formatDateTime(customer.last_login)}</p>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>

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
