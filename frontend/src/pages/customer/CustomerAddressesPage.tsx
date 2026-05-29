import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  addAddress,
  deleteAddress,
  fetchMapsGeocodeAddress,
  fetchMyAddresses,
} from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { AddressLocationPicker } from '../../components/AddressLocationPicker'
import { Alert, Button, Card, Field, Input, PageHeader } from '../../components/ui'
import type { CustomerAddress } from '../../types'

export function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = () => {
    setLoading(true)
    fetchMyAddresses()
      .then((res) => setAddresses(res.addresses))
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load addresses'),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const resetForm = () => {
    setTitle('')
    setAddress('')
    setLat(null)
    setLon(null)
  }

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    setSaving(true)
    try {
      let saveLat = lat
      let saveLon = lon
      let saveAddress = address

      if (
        saveLat == null ||
        saveLon == null ||
        Number.isNaN(saveLat) ||
        Number.isNaN(saveLon)
      ) {
        if (!address.trim()) {
          setError('Enter an address or pick a location on the map.')
          return
        }
        const geo = await fetchMapsGeocodeAddress(address.trim())
        saveLat = geo.lat
        saveLon = geo.lon
        saveAddress = geo.address || address
      }

      const res = await addAddress({
        title,
        address: saveAddress,
        lat: saveLat,
        lon: saveLon,
      })
      setSuccess(res.message)
      resetForm()
      load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not add address')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this address?')) return
    setError('')
    try {
      await deleteAddress(id)
      load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not delete')
    }
  }

  return (
    <div>
      <PageHeader
        title="Saved addresses"
        subtitle="Search on the map and confirm latitude & longitude for each location"
      />

      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert variant="success">{success}</Alert>
        </div>
      )}

      <Card className="mb-6 max-w-xl">
        <h2 className="mb-4 font-bold text-zinc-900">Add address</h2>
        <form onSubmit={handleAdd} className="space-y-4">
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
            address={address}
            lat={lat}
            lon={lon}
            onAddressChange={setAddress}
            onLocationChange={(nextLat, nextLon, nextAddress) => {
              setLat(nextLat)
              setLon(nextLon)
              if (nextAddress) setAddress(nextAddress)
            }}
            disabled={saving}
          />

          <Button type="submit" disabled={saving || addresses.length >= 5}>
            {saving ? 'Saving…' : 'Add address'}
          </Button>
          {addresses.length >= 5 && (
            <p className="text-xs text-amber-700">Maximum 5 addresses reached.</p>
          )}
        </form>
      </Card>

      {loading ? (
        <p className="text-zinc-400">Loading…</p>
      ) : addresses.length === 0 ? (
        <p className="text-sm text-zinc-500">No saved addresses yet.</p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((a) => (
            <li
              key={a.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4"
            >
              <div>
                <p className="font-bold text-zinc-900">{a.title}</p>
                <p className="mt-1 text-sm text-zinc-600">{a.address}</p>
                {a.lat != null && a.lon != null && (
                  <p className="mt-1 text-xs text-zinc-400">
                    {a.lat}, {a.lon}
                  </p>
                )}
              </div>
              <Button
                variant="danger"
                className="shrink-0 py-1 text-xs"
                onClick={() => handleDelete(a.id)}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Link to="/profile" className="mt-6 inline-block text-sm font-semibold text-violet-600">
        ← Back to account
      </Link>
    </div>
  )
}
