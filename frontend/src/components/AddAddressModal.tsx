import { useEffect, useState, type FormEvent } from 'react'
import { AddressLocationPicker } from './AddressLocationPicker'
import { Alert, Button, Field, Input, Modal } from './ui'
import { addressLatLon } from '../lib/address'
import type { CustomerAddress } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  initialAddress?: CustomerAddress | null
  onSubmit: (data: {
    title: string
    address: string
    lat: number
    lon: number
  }) => Promise<void>
  saving: boolean
  error: string
}

function CrosshairIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M12 4v16M4 12h16" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function AddAddressModal({
  open,
  onClose,
  initialAddress,
  onSubmit,
  saving,
  error,
}: Props) {
  const isEdit = initialAddress != null
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    if (!open) return
    if (initialAddress) {
      const coords = addressLatLon(initialAddress)
      setTitle(initialAddress.title ?? '')
      setAddress(initialAddress.address)
      setLat(coords ? String(coords.lat) : '')
      setLon(coords ? String(coords.lon) : '')
    } else {
      setTitle('')
      setAddress('')
      setLat('')
      setLon('')
    }
    setShowMap(false)
  }, [open, initialAddress])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const latNum = lat ? Number(lat) : NaN
    const lonNum = lon ? Number(lon) : NaN
    if (!title.trim() || !address.trim()) return
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) return
    await onSubmit({
      title: title.trim(),
      address: address.trim(),
      lat: latNum,
      lon: lonNum,
    })
  }

  const canSubmit =
    title.trim() &&
    address.trim() &&
    lat &&
    lon &&
    !Number.isNaN(Number(lat)) &&
    !Number.isNaN(Number(lon))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit address' : 'Add New Address'}
      wide
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Label">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Home"
            required
            disabled={saving}
          />
        </Field>

        <Field label="Full Address">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="7 Sunflower Court, Edison, New Jersey, USA"
            required
            disabled={saving}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude">
            <Input
              type="number"
              step="any"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="40.602546"
              required
              disabled={saving}
            />
          </Field>
          <Field label="Longitude">
            <Input
              type="number"
              step="any"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="-74.658865"
              required
              disabled={saving}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">or</span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>

        <Button
          type="button"
          variant="secondary"
          className="flex w-full items-center justify-center gap-2 !rounded-xl"
          disabled={saving}
          onClick={() => setShowMap((v) => !v)}
        >
          <CrosshairIcon />
          {showMap ? 'Hide map' : 'Select location manually'}
        </Button>

        {showMap && (
          <AddressLocationPicker
            variant="map-only"
            address={address}
            lat={lat ? Number(lat) : null}
            lon={lon ? Number(lon) : null}
            onAddressChange={setAddress}
            onLocationChange={(nextLat, nextLon, nextAddress) => {
              if (nextLat != null) setLat(String(nextLat))
              if (nextLon != null) setLon(String(nextLon))
              if (nextAddress) setAddress(nextAddress)
            }}
            disabled={saving}
          />
        )}

        <Button
          type="submit"
          className="w-full !rounded-xl !bg-sky-600 hover:!bg-sky-700"
          disabled={saving || !canSubmit}
        >
          {saving ? (isEdit ? 'Saving…' : 'Adding…') : isEdit ? 'Save changes' : 'Add address'}
        </Button>
      </form>
    </Modal>
  )
}
