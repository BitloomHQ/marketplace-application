import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addAddress,
  deleteAddress,
  fetchMapsGeocodeAddress,
  fetchMyAddresses,
} from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { AddAddressModal } from '../../components/AddAddressModal'
import { Alert, Button } from '../../components/ui'
import type { CustomerAddress } from '../../types'

function TrashIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  )
}

function formatCoords(lat: number, lon: number) {
  return `${lat}, ${lon}`
}

function AddressCard({
  item,
  onDelete,
}: {
  item: CustomerAddress
  onDelete: (id: number) => void
}) {
  return (
    <article className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold text-zinc-900">{item.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.address}</p>
        {item.lat != null && item.lon != null && (
          <p className="mt-2 text-xs font-medium text-zinc-400">{formatCoords(item.lat, item.lon)}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
        aria-label={`Delete ${item.title}`}
      >
        <TrashIcon />
      </button>
    </article>
  )
}

export function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [modalError, setModalError] = useState('')
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

  const handleAdd = async (data: {
    title: string
    address: string
    lat: number
    lon: number
  }) => {
    setModalError('')
    setSaving(true)
    try {
      let saveLat = data.lat
      let saveLon = data.lon
      let saveAddress = data.address

      if (Number.isNaN(saveLat) || Number.isNaN(saveLon)) {
        const geo = await fetchMapsGeocodeAddress(data.address)
        saveLat = geo.lat
        saveLon = geo.lon
        saveAddress = geo.address || data.address
      }

      const res = await addAddress({
        title: data.title,
        address: saveAddress,
        lat: saveLat,
        lon: saveLon,
      })
      setSuccess(res.message)
      setModalOpen(false)
      load()
    } catch (err) {
      setModalError(err instanceof ApiRequestError ? err.message : 'Could not add address')
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

  const atLimit = addresses.length >= 5

  return (
    <div className="mx-auto max-w-7xl">
      <nav className="mb-4 text-sm text-zinc-500">
        <Link to="/customer-dashboard" className="hover:text-sky-600">
          Home
        </Link>
        <span className="mx-2 text-zinc-300">›</span>
        <span className="font-medium text-zinc-800">Address</span>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">Saved address</h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-500">
          Keep your home and visit locations handy — use them when booking services and track
          where each job is scheduled.
        </p>
      </header>

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

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-zinc-200" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
          <p className="text-sm text-zinc-500">No saved addresses yet.</p>
          <p className="mt-1 text-xs text-zinc-400">Add one to book services faster.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {addresses.map((a) => (
            <li key={a.id}>
              <AddressCard item={a} onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 text-center">
        <Button
          className="w-full !rounded-xl !bg-sky-600 py-3.5 text-base font-bold hover:!bg-sky-700 sm:w-auto sm:px-8"
          disabled={atLimit}
          onClick={() => {
            setModalError('')
            setModalOpen(true)
          }}
        >
          + Add address
        </Button>
        {atLimit && (
          <p className="mt-2 text-xs text-amber-700">Maximum 5 addresses reached.</p>
        )}
      </div>

      <AddAddressModal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleAdd}
        saving={saving}
        error={modalError}
      />
    </div>
  )
}
