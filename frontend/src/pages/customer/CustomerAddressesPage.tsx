import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  addAddress,
  deleteAddress,
  editAddress,
  fetchMapsGeocodeAddress,
  fetchMyAddresses,
} from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { AddAddressModal } from '../../components/AddAddressModal'
import { Alert, Button } from '../../components/ui'
import { addressLatLon } from '../../lib/address'
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

function PencilIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  )
}

function formatCoords(lat: number, lon: number) {
  return `${lat}, ${lon}`
}

function AddressCard({
  item,
  onEdit,
  onDelete,
}: {
  item: CustomerAddress
  onEdit: (item: CustomerAddress) => void
  onDelete: (id: number) => void
}) {
  return (
    <article className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold text-zinc-900">{item.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">{item.address}</p>
        {(() => {
          const coords = addressLatLon(item)
          return coords ? (
            <p className="mt-2 text-xs font-medium text-zinc-400">
              {formatCoords(coords.lat, coords.lon)}
            </p>
          ) : (
            <p className="mt-2 text-xs font-medium text-amber-600">
              No map coordinates — edit to pin on map
            </p>
          )
        })()}
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition hover:bg-sky-100"
          aria-label={`Edit ${item.title}`}
        >
          <PencilIcon />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
          aria-label={`Delete ${item.title}`}
        >
          <TrashIcon />
        </button>
      </div>
    </article>
  )
}

export function CustomerAddressesPage() {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null)
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

  const resolveCoords = async (data: {
    title: string
    address: string
    lat: number
    lon: number
  }) => {
    let saveLat = data.lat
    let saveLon = data.lon
    let saveAddress = data.address

    if (Number.isNaN(saveLat) || Number.isNaN(saveLon)) {
      const geo = await fetchMapsGeocodeAddress(data.address)
      saveLat = geo.lat
      saveLon = geo.lon
      saveAddress = geo.address || data.address
    }

    return { title: data.title, address: saveAddress, latitude: saveLat, longitude: saveLon }
  }

  const handleAdd = async (data: {
    title: string
    address: string
    lat: number
    lon: number
  }) => {
    setModalError('')
    setSaving(true)
    try {
      const payload = await resolveCoords(data)
      await addAddress(payload)
      setSuccess('Address saved successfully')
      setModalOpen(false)
      load()
    } catch (err) {
      setModalError(err instanceof ApiRequestError ? err.message : 'Could not add address')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (data: {
    title: string
    address: string
    lat: number
    lon: number
  }) => {
    if (!editingAddress) return
    setModalError('')
    setSaving(true)
    try {
      const payload = await resolveCoords(data)
      await editAddress(editingAddress.id, payload)
      setSuccess('Address updated successfully')
      setEditingAddress(null)
      setModalOpen(false)
      load()
    } catch (err) {
      setModalError(err instanceof ApiRequestError ? err.message : 'Could not update address')
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

  const openAdd = () => {
    setModalError('')
    setEditingAddress(null)
    setModalOpen(true)
  }

  const openEdit = (item: CustomerAddress) => {
    setModalError('')
    setEditingAddress(item)
    setModalOpen(true)
  }

  const closeModal = () => {
    if (saving) return
    setModalOpen(false)
    setEditingAddress(null)
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
              <AddressCard item={a} onEdit={openEdit} onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 text-center">
        <Button
          className="w-full !rounded-xl !bg-sky-600 py-3.5 text-base font-bold hover:!bg-sky-700 sm:w-auto sm:px-8"
          disabled={atLimit}
          onClick={openAdd}
        >
          + Add address
        </Button>
        {atLimit && (
          <p className="mt-2 text-xs text-amber-700">Maximum 5 addresses reached.</p>
        )}
      </div>

      <AddAddressModal
        open={modalOpen}
        onClose={closeModal}
        initialAddress={editingAddress}
        onSubmit={editingAddress ? handleEdit : handleAdd}
        saving={saving}
        error={modalError}
      />
    </div>
  )
}
