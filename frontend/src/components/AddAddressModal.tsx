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
      title={isEdit ? 'Edit address' : 'Add a new address'}
      subtitle="Pin it on the map or use your current location — the address fills in automatically."
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

        <Field label="Full address" required>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Pick a point on the map or use your current location"
            disabled={saving}
          />
        </Field>

        <Button type="submit" className="w-full py-3" disabled={saving || !canSubmit}>
          {saving ? (isEdit ? 'Saving…' : 'Adding…') : isEdit ? 'Save changes' : 'Add address'}
        </Button>
      </form>
    </Modal>
  )
}
