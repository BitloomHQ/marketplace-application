import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteAdminService, fetchAdminServices } from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { CreateServiceModal } from '../../components/CreateServiceModal'
import { EditServiceModal } from '../../components/EditServiceModal'
import {
  EditIcon,
  IconActionButton,
  TrashIcon,
} from '../../components/IconActionButton'
import { ReasonActionModal } from '../../components/ReasonActionModal'
import { Alert, Badge, Button, Card, PageHeader } from '../../components/ui'
import { DEFAULT_SERVICE_IMAGE } from '../../lib/defaultServiceImage'
import { formatStatus } from '../../lib/format'
import { resolveMediaUrl } from '../../lib/media'
import type { ServiceCategory } from '../../types'

function serviceStatusTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'coming_soon') return 'warning'
  return 'neutral'
}

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Service categories" subtitle="Create and manage marketplace services" />
        <div className="flex gap-2">
          <Button onClick={() => setCreateOpen(true)}>Create service</Button>
          <Link to="/admin-dashboard">
            <Button variant="secondary">Back</Button>
          </Link>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <p className="text-zinc-400">Loading services…</p>
      ) : services.length === 0 ? (
        <Card className="text-center text-sm text-zinc-500">
          No services yet. Create your first service category.
        </Card>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <Card key={service.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <img
                  src={
                    service.service_image
                      ? resolveMediaUrl(service.service_image) ?? DEFAULT_SERVICE_IMAGE
                      : DEFAULT_SERVICE_IMAGE
                  }
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-zinc-200"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-zinc-900">{service.name}</p>
                    <Badge tone={serviceStatusTone(service.status)}>
                      {formatStatus(service.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{service.key}</p>
                  <p className="mt-1 text-sm text-zinc-600">{service.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <IconActionButton label="Edit service" onClick={() => setEditService(service)}>
                  <EditIcon />
                </IconActionButton>
                <IconActionButton
                  label="Delete"
                  variant="dangerSolid"
                  onClick={() => setDeleteTarget(service)}
                >
                  <TrashIcon />
                </IconActionButton>
              </div>
            </Card>
          ))}
        </div>
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
