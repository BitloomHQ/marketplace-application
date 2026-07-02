import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchActiveServices, fetchMyAddresses } from '../api/accounts'
import { createServiceRequest } from '../api/services'
import { ApiRequestError } from '../api/client'
import { FileUploadZone } from './FileUploadZone'
import { LawnPolygonDrawer } from './LawnPolygonDrawer'
import { Alert, Field, Modal, ModalActions, Select, Textarea } from './ui'
import { polygonAreaSqMeters } from '../lib/polygon'
import { addressLatLon } from '../lib/address'
import { addStoredRequestId } from '../lib/storage'
import type { ActiveService, CustomerAddress, PolygonPoint } from '../types'

const LAWN_CORNERS = 4

type Props = {
  open: boolean
  onClose: () => void
  initialServiceType?: string
  onCreated?: (requestId: number) => void
}

export function CreateRequestModal({
  open,
  onClose,
  initialServiceType = 'plumber',
  onCreated,
}: Props) {
  const navigate = useNavigate()
  const formId = useId()
  const resolvedFormId = formId.replace(/:/g, '')
  const [serviceType, setServiceType] = useState<string>(initialServiceType)
  const [activeServices, setActiveServices] = useState<ActiveService[]>([])
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [addressId, setAddressId] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [polygonPoints, setPolygonPoints] = useState<PolygonPoint[]>([])
  const [loadingAddresses, setLoadingAddresses] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isGardener = serviceType === 'gardener'
  const selectedAddress = addresses.find((a) => String(a.id) === addressId)
  const selectedCoords = selectedAddress ? addressLatLon(selectedAddress) : null
  const lawnAreaM2 =
    polygonPoints.length >= 3 ? Math.round(polygonAreaSqMeters(polygonPoints)) : undefined

  useEffect(() => {
    if (!open) return
    setServiceType(initialServiceType)
    setDescription('')
    setImage(null)
    setPolygonPoints([])
    setError('')
    setLoadingAddresses(true)
    Promise.all([fetchMyAddresses(), fetchActiveServices()])
      .then(([addressRes, servicesRes]) => {
        setAddresses(addressRes.addresses)
        setAddressId(addressRes.addresses[0] ? String(addressRes.addresses[0].id) : '')
        setActiveServices(servicesRes.services)
        if (servicesRes.services.length > 0) {
          const match = servicesRes.services.find((s) => s.key === initialServiceType)
          setServiceType(match?.key ?? servicesRes.services[0].key)
        }
      })
      .catch(() => {
        setAddresses([])
        setActiveServices([])
      })
      .finally(() => setLoadingAddresses(false))
  }, [open, initialServiceType])

  useEffect(() => {
    setPolygonPoints([])
  }, [addressId])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!addressId) {
      setError('Please select a saved address.')
      return
    }
    if (isGardener) {
      if (!selectedCoords) {
        setError('Selected address must have a map location. Update it in Saved addresses.')
        return
      }
      if (polygonPoints.length !== LAWN_CORNERS) {
        setError(`Mark all ${LAWN_CORNERS} corners of your lawn on the satellite map.`)
        return
      }
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

  const canSubmit = addresses.length > 0 && !loadingAddresses

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Book a service"
      subtitle="Select your address, share service details, and connect with verified professionals ready to help at your doorstep."
      wide
      footer={
        canSubmit ? (
          <ModalActions
            formId={resolvedFormId}
            onCancel={handleClose}
            submitLabel="Submit request"
            loading={loading}
            disabled={addresses.length === 0}
          />
        ) : undefined
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {loadingAddresses ? (
        <p className="text-center text-sm text-zinc-400">Loading your addresses…</p>
      ) : addresses.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
          <p>You need at least one saved address before booking.</p>
          <Link to="/customer/addresses" className="mt-2 inline-block font-semibold text-sky-600">
            Add an address →
          </Link>
        </div>
      ) : (
        <form id={resolvedFormId} onSubmit={handleSubmit} className="space-y-5">
          <Field label="Service type" required>
            <Select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="!rounded-xl"
            >
              <option value="" disabled>
                Select
              </option>
              {activeServices.map((service) => (
                <option key={service.id} value={service.key}>
                  {service.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Saved address"
            required
            action={
              <Link
                to="/customer/addresses"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              >
                Manage addresses
              </Link>
            }
          >
            <Select
              value={addressId}
              onChange={(e) => setAddressId(e.target.value)}
              required
              className="!rounded-xl"
            >
              <option value="" disabled>
                Select
              </option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} — {a.address}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter the service description for this one please"
              className="!min-h-[100px] !rounded-xl"
            />
          </Field>

          {isGardener ? (
            <div>
              <p className="mb-2 text-sm font-semibold text-zinc-900">Lawn area</p>
              {selectedCoords ? (
                <LawnPolygonDrawer
                  centerLat={selectedCoords.lat}
                  centerLon={selectedCoords.lon}
                  value={polygonPoints}
                  onChange={setPolygonPoints}
                  disabled={loading}
                />
              ) : (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  This address has no coordinates.{' '}
                  <Link to="/customer/addresses" className="font-semibold text-sky-600">
                    Update the address on the map
                  </Link>{' '}
                  before booking gardener services.
                </p>
              )}
            </div>
          ) : (
            <div>
              <FileUploadZone file={image} onChange={setImage} disabled={loading} />
            </div>
          )}
        </form>
      )}
    </Modal>
  )
}
