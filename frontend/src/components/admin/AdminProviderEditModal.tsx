import { useEffect, useId, useState, type FormEvent } from 'react'
import {
  activateProvider,
  deactivateProvider,
  fetchAdminProviderDetail,
  unverifyProvider,
  updateAdminProvider,
  verifyProvider,
  type AdminProvider,
} from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { ADMIN_STATUS_REASON } from '../../lib/adminStatus'
import { AdminProviderStatusFields } from './AdminStatusSelect'
import { Alert, Field, Input, Modal, ModalActions, Textarea } from '../ui'

type Props = {
  provider: AdminProvider | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export function AdminProviderEditModal({ provider, open, onClose, onUpdated }: Props) {
  const formId = useId().replace(/:/g, '')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [bio, setBio] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [isActive, setIsActive] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [isApproved, setIsApproved] = useState(true)
  const [initialActive, setInitialActive] = useState(true)
  const [initialVerified, setInitialVerified] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !provider) return
    setError('')
    setProfilePicture(null)
    setLoadingDetail(true)
    fetchAdminProviderDetail(provider.id)
      .then((res) => {
        const data = res.data
        setUsername(data.username)
        setEmail(data.email)
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setPhone(data.phone ?? '')
        setAddress(data.address ?? '')
        setBio(data.bio ?? '')
        setExperienceYears(
          data.experience_years != null ? String(data.experience_years) : '',
        )
        setIsActive(data.is_active)
        setIsVerified(data.is_verified)
        setIsApproved(data.is_approved)
        setInitialActive(data.is_active)
        setInitialVerified(data.is_verified)
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load provider')
      })
      .finally(() => setLoadingDetail(false))
  }, [open, provider])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!provider) return
    setError('')
    setLoading(true)
    try {
      await updateAdminProvider(provider.id, {
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        address,
        bio,
        experience_years: experienceYears.trim() ? Number(experienceYears) : null,
        profile_picture: profilePicture,
      })
      if (isApproved) {
        if (isActive !== initialActive) {
          if (isActive) await activateProvider(provider.id, ADMIN_STATUS_REASON)
          else await deactivateProvider(provider.id, ADMIN_STATUS_REASON)
        }
        if (isVerified !== initialVerified) {
          if (isVerified) await verifyProvider(provider.id, ADMIN_STATUS_REASON)
          else await unverifyProvider(provider.id, ADMIN_STATUS_REASON)
        }
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
      title="Edit provider"
      subtitle={provider ? `${provider.username} · ${provider.role}` : undefined}
      wide
      footer={
        <ModalActions
          formId={formId}
          onCancel={handleClose}
          submitLabel="Save changes"
          loading={loading}
          disabled={!provider || loadingDetail}
        />
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {loadingDetail ? (
        <p className="text-sm text-zinc-500">Loading provider details…</p>
      ) : provider ? (
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <AdminProviderStatusFields
            isActive={isActive}
            isVerified={isVerified}
            isApproved={isApproved}
            disabled={loading}
            onActiveChange={setIsActive}
            onVerifiedChange={setIsVerified}
          />
          <div className="grid gap-4 sm:grid-cols-2">
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
          <Field label="Experience (years)">
            <Input
              type="number"
              min={0}
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
              disabled={loading}
            />
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
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} disabled={loading} rows={2} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Bio">
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} disabled={loading} rows={3} />
            </Field>
          </div>
          </div>
        </form>
      ) : null}
    </Modal>
  )
}
