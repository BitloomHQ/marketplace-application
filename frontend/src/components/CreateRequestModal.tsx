import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchMyAddresses } from '../api/accounts'
import { createServiceRequest } from '../api/services'
import { ApiRequestError } from '../api/client'
import { LawnPolygonDrawer } from './LawnPolygonDrawer'
import { Alert, Button, Field, Input, Modal, Select, Textarea } from './ui'
import { polygonArea } from '../lib/polygon'
import { SERVICE_OPTIONS } from '../lib/format'
import { addStoredRequestId } from '../lib/storage'
import type { CustomerAddress, PolygonPoint, ServiceType } from '../types'

const M2_PER_PX2 = 0.0025

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
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [addressId, setAddressId] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isGardener = serviceType === 'gardener'
  const lawnAreaM2 =
    polygonPoints.length >= 3
      ? Math.round(polygonArea(polygonPoints) * M2_PER_PX2)
      : undefined

  useEffect(() => {
    if (!open) return
    setServiceType(initialServiceType)
    setDescription('')
    setImage(null)
    setPolygonPoints([])
    setError('')
    setLoadingAddresses(true)
    fetchMyAddresses()
      .then((res) => {
        setAddresses(res.addresses)
        setAddressId(res.addresses[0] ? String(res.addresses[0].id) : '')
      })
      .catch(() => setAddresses([]))
      .finally(() => setLoadingAddresses(false))
  }, [open, initialServiceType])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!addressId) {
      setError('Please select a saved address.')
      return
    }
    if (isGardener && polygonPoints.length < 3) {
      setError('Draw the lawn area with at least 3 points.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await createServiceRequest({
        service_type: serviceType,
        address_id: Number(addressId),
        description: description || undefined,
        lawn_area: isGardener ? lawnAreaM2 : undefined,
        polygon_points: isGardener ? polygonPoints : undefined,
        image: !isGardener ? image ?? undefined : undefined,
      })
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
        Choose a saved address. Plumbers and electricians can attach a photo; gardeners mark the lawn area.
      </p>
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loadingAddresses ? (
        <p className="text-sm text-zinc-400">Loading your addresses…</p>
      ) : addresses.length === 0 ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>You need at least one saved address before booking.</p>
          <Link to="/customer/addresses" className="mt-2 inline-block font-semibold text-violet-600">
            Add an address →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Service type">
            <Select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value as ServiceType)}
            >
              {SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Saved address">
            <Select value={addressId} onChange={(e) => setAddressId(e.target.value)} required>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} — {a.address}
                </option>
              ))}
            </Select>
            <Link to="/customer/addresses" className="mt-1 inline-block text-xs font-medium text-violet-600">
              Manage addresses
            </Link>
          </Field>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isGardener ? 'Need grass cutting' : 'Kitchen pipe leakage'}
            />
          </Field>

          {isGardener ? (
            <Field label="Lawn area">
              <LawnPolygonDrawer
                value={polygonPoints}
                onChange={setPolygonPoints}
                disabled={loading}
              />
            </Field>
          ) : (
            <Field label="Photo (optional)">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              />
            </Field>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={loading}
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              disabled={loading || addresses.length === 0}
            >
              {loading ? 'Submitting…' : 'Submit request'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
