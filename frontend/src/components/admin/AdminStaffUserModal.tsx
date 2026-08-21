import { useEffect, useId, useState, type FormEvent } from 'react'
import {
  createAdminUser,
  fetchAdminUserDetail,
  updateAdminUser,
  type AdminPermissions,
  type AdminStaffUser,
} from '../../api/admin'
import { ApiRequestError } from '../../api/client'
import { Alert, Field, Input, Modal, ModalActions } from '../ui'
import { AdminPermissionsFields, DEFAULT_ADMIN_PERMISSIONS } from './AdminPermissionsFields'

type Props = {
  adminUser: AdminStaffUser | null
  open: boolean
  mode: 'create' | 'edit'
  onClose: () => void
  onSaved: () => void
}

export function AdminStaffUserModal({ adminUser, open, mode, onClose, onSaved }: Props) {
  const formId = useId().replace(/:/g, '')
  const isCreate = mode === 'create'
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [permissions, setPermissions] = useState<AdminPermissions>(DEFAULT_ADMIN_PERMISSIONS)
  const [loading, setLoading] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    setPassword('')
    if (isCreate) {
      setUsername('')
      setEmail('')
      setFirstName('')
      setLastName('')
      setPermissions(DEFAULT_ADMIN_PERMISSIONS)
      return
    }
    if (!adminUser) return
    setLoadingDetail(true)
    fetchAdminUserDetail(adminUser.id)
      .then((res) => {
        const data = res.data
        setUsername(data.username)
        setEmail(data.email)
        setFirstName(data.first_name ?? '')
        setLastName(data.last_name ?? '')
        setPermissions(data.permissions ?? DEFAULT_ADMIN_PERMISSIONS)
      })
      .catch((err) => {
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load admin user')
      })
      .finally(() => setLoadingDetail(false))
  }, [open, adminUser, isCreate])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isCreate) {
        await createAdminUser({
          username,
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          permissions,
        })
      } else if (adminUser) {
        await updateAdminUser(adminUser.id, {
          email,
          first_name: firstName,
          last_name: lastName,
          permissions,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isCreate ? 'Create admin user' : 'Edit admin user'}
      subtitle={!isCreate && adminUser ? adminUser.username : undefined}
      wide
      footer={
        <ModalActions
          formId={formId}
          onCancel={handleClose}
          submitLabel={isCreate ? 'Create admin' : 'Save changes'}
          loading={loading}
          disabled={(!isCreate && !adminUser) || loadingDetail}
        />
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {loadingDetail ? (
        <p className="text-sm text-zinc-500">Loading admin user…</p>
      ) : (
        <form id={formId} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Username">
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading || !isCreate}
                className={!isCreate ? 'bg-zinc-50 text-zinc-500' : undefined}
              />
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
            {isCreate && (
              <Field label="Password">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
              </Field>
            )}
            <Field label="First name">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={loading} />
            </Field>
            <Field label="Last name">
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={loading} />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-zinc-700">Permissions</p>
            <AdminPermissionsFields value={permissions} onChange={setPermissions} disabled={loading} />
          </div>
        </form>
      )}
    </Modal>
  )
}
