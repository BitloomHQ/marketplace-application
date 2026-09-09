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
import { ListCardSkeleton } from '../../components/Shimmer'
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

function PinIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
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
  const isPinned = Boolean(addressLatLon(item))

  return (
    <article className="group flex h-full flex-col gap-3 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-all duration-150 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_24px_-12px_rgba(0,0,0,0.12)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
          <PinIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-zinc-900">{item.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-zinc-600">{item.address}</p>
        </div>
      </div>

      {isPinned ? (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
          Pinned on map
        </span>
      ) : (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          Needs a map pin — edit to add one
        </span>
      )}

      <div className="mt-auto flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-50 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
        >
          <PencilIcon />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
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
        <ListCardSkeleton count={2} />
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-zinc-400 shadow-sm">
            <PinIcon />
          </span>
          <p className="text-sm font-semibold text-zinc-700">No saved addresses yet</p>
          <p className="mt-1 text-xs text-zinc-500">Add one to book services faster.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {addresses.map((a) => (
            <li key={a.id}>
              <AddressCard item={a} onEdit={openEdit} onDelete={handleDelete} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 text-center">
        <Button
          className="flex w-full items-center justify-center gap-2 py-3.5 text-base sm:w-auto sm:px-8"
          disabled={atLimit}
          onClick={openAdd}
        >
          <PlusIcon />
          Add address
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
