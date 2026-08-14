import { useEffect, useId, useState, type FormEvent } from 'react'
import { updateAdminService } from '../api/admin'
import { ApiRequestError } from '../api/client'
import { Alert, Field, Input, Modal, ModalActions, Select, Textarea } from './ui'
import type { ServiceCategory } from '../types'

type Props = {
  service: ServiceCategory | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function EditServiceModal({ service, open, onClose, onUpdated }: Props) {
  const formId = useId().replace(/:/g, '')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [startDate, setStartDate] = useState('')
  const [serviceImage, setServiceImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !service) return
    setName(service.name)
    setDescription(service.description)
    setStatus(service.status)
    setStartDate(service.start_date ?? '')
    setServiceImage(null)
    setError('')
  }, [open, service])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!service?.id) return
    setError('')
    setLoading(true)
    try {
      await updateAdminService(service.id, {
        name,
        description,
        status,
        start_date: startDate,
        service_image: serviceImage,
      })
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit service"
      subtitle={service ? `Update ${service.name}` : undefined}
      wide
      footer={
        <ModalActions
          formId={formId}
          onCancel={handleClose}
          submitLabel="Save changes"
          loading={loading}
          disabled={!service}
        />
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {service && (
        <form id={formId} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
          </Field>
          <Field label="Key">
            <Input value={service.key} disabled className="bg-zinc-50 text-zinc-500" />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={loading}>
              <option value="active">Active</option>
              <option value="coming_soon">Coming soon</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
          <Field label="Start date">
            <Input
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Yet to start"
              disabled={loading}
            />
          </Field>
          <Field label="Replace image">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setServiceImage(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
          </Field>
          <div className="sm:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            Display order is managed on the services list. Drag services there to reorder them.
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                disabled={loading}
              />
            </Field>
          </div>
        </form>
      )}
    </Modal>
  )
}
