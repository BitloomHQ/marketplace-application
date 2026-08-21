import { useEffect, useId, useState, type FormEvent } from 'react'
import {
  activateCustomer,
  deactivateCustomer,
  fetchAdminCustomerDetail,
  updateAdminCustomer,
  type AdminCustomer,
} from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { AdminActiveStatusSelect } from './AdminStatusSelect'
import { Alert, Field, Input, Modal, ModalActions, Textarea } from '../ui'

type Props = {
  customer: AdminCustomer | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function AdminCustomerEditModal({ customer, open, onClose, onUpdated }: Props) {
  const formId = useId().replace(/:/g, '')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [initialActive, setInitialActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !customer) return
    setError('')
    setProfilePicture(null)
    setLoadingDetail(true)
    fetchAdminCustomerDetail(customer.id)
      .then((res) => {
        const data = res.data
        setUsername(data.username)
        setEmail(data.email)
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setPhone(data.phone ?? '')
        setAddress(data.address ?? '')
        setIsActive(data.is_active)
        setInitialActive(data.is_active)
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load customer')
      })
      .finally(() => setLoadingDetail(false))
  }, [open, customer])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!customer) return
    setError('')
    setLoading(true)
    try {
      await updateAdminCustomer(customer.id, {
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        address,
        profile_picture: profilePicture,
      })
      if (isActive !== initialActive) {
        if (isActive) await activateCustomer(customer.id)
        else await deactivateCustomer(customer.id)
      }
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit customer"
      subtitle={customer ? customer.full_name || customer.username : undefined}
      wide
      footer={
        <ModalActions
          formId={formId}
          onCancel={handleClose}
          submitLabel="Save changes"
          loading={loading}
          disabled={!customer || loadingDetail}
        />
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {loadingDetail ? (
        <p className="text-sm text-zinc-500">Loading customer details…</p>
      ) : customer ? (
        <form id={formId} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Account status">
              <AdminActiveStatusSelect value={isActive} disabled={loading} onChange={setIsActive} />
            </Field>
          </div>
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required disabled={loading} />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </Field>
          <Field label="First name">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} />
          </Field>
          <Field label="Last name">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
          </Field>
          <Field label="Profile picture">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setProfilePicture(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} disabled={loading} rows={3} />
            </Field>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}
