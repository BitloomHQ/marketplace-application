import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createServiceRequest } from '../api/services'
import { ApiRequestError } from '../api/client'
import { Alert, Button, Field, Input, Modal, Select, Textarea } from './ui'
import { SERVICE_OPTIONS } from '../lib/format'
import { addStoredRequestId } from '../lib/storage'
import type { ServiceType } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  initialServiceType?: ServiceType
  onCreated?: (requestId: number) => void
}

export function CreateRequestModal({
  open,
  onClose,
  initialServiceType = 'plumber',
  onCreated,
}: Props) {
  const navigate = useNavigate()
  const [serviceType, setServiceType] = useState<ServiceType>(initialServiceType)
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setServiceType(initialServiceType)
    setAddress('')
    setDescription('')
    setImage(null)
    setError('')
  }, [open, initialServiceType])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await createServiceRequest(
        {
          service_type: serviceType,
          address,
          description: description || undefined,
        },
        image ?? undefined,
      )
      addStoredRequestId(res.request_id)
      onClose()
      onCreated?.(res.request_id)
      navigate(`/customer/quotes/${res.request_id}`, {
        state: { created: true, requestId: res.request_id },
      })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Book a service" wide>
      <p className="mb-4 text-sm text-zinc-500">
        Tell us what you need — verified pros nearby will send you quotes.
      </p>
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Service type">
          <Select value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
            {SERVICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Address">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            placeholder="Noida Sector 62"
          />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Kitchen pipe leakage"
          />
        </Field>
        <Field label="Photo (optional)">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" disabled={loading} onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Submitting…' : 'Submit request'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
