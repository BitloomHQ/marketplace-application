import { useEffect, useState } from 'react'
import { deleteAdminService, fetchAdminServices, reorderAdminServices } from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { SortableServiceList } from '../../components/admin/SortableServiceList'
import { CreateServiceModal } from '../../components/CreateServiceModal'
import { EditServiceModal } from '../../components/EditServiceModal'
import { ReasonActionModal } from '../../components/ReasonActionModal'
import { Alert, Button, Card, PageHeader } from '../../components/ui'
import { AdminListRowSkeleton } from '../../components/Shimmer'
import type { ServiceCategory } from '../../types'

export function AdminServicesPage() {
  const [services, setServices] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editService, setEditService] = useState<ServiceCategory | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceCategory | null>(null)

  const load = () => {
    setLoading(true)
    fetchAdminServices()
      .then((res) => setServices(res.services))
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load services'),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (reason: string) => {
    if (!deleteTarget?.id) return
    setError('')
    try {
      await deleteAdminService(deleteTarget.id, reason)
      load()
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Delete failed'
      setError(message)
      throw new Error(message)
    }
  }

  const handleReorder = async (next: ServiceCategory[]) => {
    const order = next.map((service) => service.id).filter((id): id is number => id != null)
    if (order.length === 0) return

    setError('')
    try {
      await reorderAdminServices(order)
      setServices(next.map((service, index) => ({ ...service, display_order: index + 1 })))
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to update order'
      setError(message)
      throw new Error(message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader subtitle="Create and manage marketplace services" />
        <Button onClick={() => setCreateOpen(true)}>Create service</Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <AdminListRowSkeleton count={4} />
      ) : services.length === 0 ? (
        <Card className="text-center text-sm text-zinc-500">
          No services yet. Create your first service category.
        </Card>
      ) : (
        <SortableServiceList
          services={services}
          onEdit={setEditService}
          onDelete={setDeleteTarget}
          onReorder={handleReorder}
        />
      )}

      <CreateServiceModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />

      <EditServiceModal
        service={editService}
        open={editService !== null}
        onClose={() => setEditService(null)}
        onUpdated={load}
      />

      <ReasonActionModal
        open={deleteTarget !== null}
        title="Delete service"
        subtitle={deleteTarget ? `Remove ${deleteTarget.name} from the marketplace` : undefined}
        confirmLabel="Delete"
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
