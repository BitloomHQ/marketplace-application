import { useEffect, useState } from 'react'
import { deleteAdminUser, fetchAdminUsers, type AdminStaffUser } from '../api/admin'
import { ApiRequestError } from '../api/client'
import { AdminStaffUserModal } from '../components/AdminStaffUserModal'
import { EditIcon, IconActionButton, TrashIcon } from '../components/IconActionButton'
import { AdminListRowSkeleton } from '../components/Shimmer'
import { Alert, Badge, Button, Card, PageHeader } from '../components/ui'

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; user: AdminStaffUser }
  | null

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminStaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [modal, setModal] = useState<ModalState>(null)

  const load = () => {
    setLoading(true)
    fetchAdminUsers()
      .then((res) => setUsers(res.data))
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load admin users'),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (user: AdminStaffUser) => {
    if (!window.confirm(`Delete admin user "${user.username}"? This cannot be undone.`)) return
    setBusyId(user.id)
    setError('')
    try {
      await deleteAdminUser(user.id)
      load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  const permissionCount = (user: AdminStaffUser) =>
    Object.values(user.permissions ?? {}).filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader subtitle="Create and manage permission-based admin accounts" />
        <Button onClick={() => setModal({ mode: 'create' })}>Create admin</Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <AdminListRowSkeleton count={4} />
      ) : users.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">No admin users yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <Card key={user.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-zinc-900">{user.full_name || user.username}</p>
                  <p className="text-sm text-zinc-500">
                    {user.email} · @{user.username}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone={user.is_active ? 'success' : 'danger'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-xs text-zinc-500">{permissionCount(user)} permissions</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <IconActionButton
                    label="Edit"
                    disabled={busyId === user.id}
                    onClick={() => setModal({ mode: 'edit', user })}
                  >
                    <EditIcon />
                  </IconActionButton>
                  <IconActionButton
                    label="Delete"
                    variant="dangerSolid"
                    disabled={busyId === user.id}
                    onClick={() => handleDelete(user)}
                  >
                    <TrashIcon />
                  </IconActionButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <AdminStaffUserModal
        adminUser={modal?.mode === 'edit' ? modal.user : null}
        open={modal !== null}
        mode={modal?.mode ?? 'create'}
        onClose={() => setModal(null)}
        onSaved={load}
      />
    </div>
  )
}
