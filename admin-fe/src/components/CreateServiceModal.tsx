import { useEffect, useId, useState, type FormEvent } from 'react'
import { createAdminService } from '../api/admin'
import { ApiRequestError } from '../api/client'
import { Alert, Field, Input, Modal, ModalActions, Select, Textarea } from './ui'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateServiceModal({ open, onClose, onCreated }: Props) {
  const formId = useId().replace(/:/g, '')
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [serviceImage, setServiceImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setName('')
    setKey('')
    setDescription('')
    setStatus('active')
    setServiceImage(null)
    setError('')
  }, [open])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await createAdminService({
        name,
        key,
        description,
        status,
        service_image: serviceImage,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Create failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create service"
      subtitle="Add a new service category to the marketplace."
      wide
      footer={
        <ModalActions
          formId={formId}
          onCancel={handleClose}
          submitLabel="Create service"
          loading={loading}
        />
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form id={formId} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} required disabled={loading} />
        </Field>
        <Field label="Key">
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="plumber"
            required
            disabled={loading}
          />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={loading}>
            <option value="active">Active</option>
            <option value="coming_soon">Coming soon</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <Field label="Service image">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setServiceImage(e.target.files?.[0] ?? null)}
            disabled={loading}
          />
        </Field>
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
    </Modal>
  )
}
