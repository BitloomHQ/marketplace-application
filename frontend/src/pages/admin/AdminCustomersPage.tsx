import { useEffect, useState } from 'react'
import {
  activateCustomer,
  deactivateCustomer,
  fetchAdminCustomers,
  type AdminCustomer,
} from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { AdminCustomerEditModal } from '../../components/admin/AdminCustomerEditModal'
import { AdminActiveStatusSelect } from '../../components/admin/AdminStatusSelect'
import {
  AdminActionButton,
  EditIcon,
} from '../../components/IconActionButton'
import { AdminListRowSkeleton } from '../../components/Shimmer'
import { Alert, Badge, Card, PageHeader } from '../../components/ui'

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [editing, setEditing] = useState<AdminCustomer | null>(null)

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

  const changeStatus = async (customer: AdminCustomer, active: boolean) => {
    if (customer.is_active === active) return
    setBusyId(customer.id)
    setError('')
    try {
      if (active) await activateCustomer(customer.id)
      else await deactivateCustomer(customer.id)
      load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Status update failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader subtitle="View, edit, and manage customer accounts" />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <AdminListRowSkeleton count={5} />
      ) : customers.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">No customers found.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <Card key={customer.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-zinc-900">{customer.full_name || customer.username}</p>
                  <p className="text-sm text-zinc-500">
                    {customer.email} · @{customer.username}
                  </p>
                  {customer.phone && (
                    <p className="mt-1 text-xs text-zinc-500">{customer.phone}</p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <Badge tone={customer.is_active ? 'success' : 'danger'}>
                      {customer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <span>
                      {customer.is_email_verified ? 'Email verified' : 'Email not verified'}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AdminActiveStatusSelect
                    value={customer.is_active}
                    disabled={busyId === customer.id}
                    onChange={(active) => changeStatus(customer, active)}
                  />
                  <AdminActionButton
                    label="Edit"
                    variant="secondary"
                    disabled={busyId === customer.id}
                    onClick={() => setEditing(customer)}
                  >
                    <EditIcon />
                  </AdminActionButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AdminCustomerEditModal
        customer={editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onUpdated={load}
      />
    </div>
  )
}
