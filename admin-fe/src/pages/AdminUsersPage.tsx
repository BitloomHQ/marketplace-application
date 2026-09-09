import { useEffect, useMemo, useState } from 'react'
import { deleteAdminUser, fetchAdminUsers, type AdminStaffUser } from '../api/admin'
import { ApiRequestError } from '../api/client'
import { AdminStaffUserModal } from '../components/AdminStaffUserModal'
import { EditIcon, IconActionButton, TrashIcon } from '../components/IconActionButton'
import { AdminListRowSkeleton } from '../components/Shimmer'
import { SortControl, sortByKey, type SortDirection } from '../components/SortControl'
import { Alert, Badge, Button, Card, PageHeader } from '../components/ui'

type ModalState =
  | { mode: 'create' }
  | { mode: 'edit'; user: AdminStaffUser }
  | null

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'date_joined', label: 'Date joined' },
  { value: 'status', label: 'Status' },
]

function extract(u: AdminStaffUser, key: string): string | number {
  if (key === 'name') return (u.full_name || u.username).toLowerCase()
  if (key === 'date_joined') return new Date(u.date_joined).getTime()
  if (key === 'status') return u.is_active ? 1 : 0
  return ''
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-700 ring-1 ring-violet-200/70">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminStaffUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [sortKey, setSortKey] = useState('date_joined')
  const [direction, setDirection] = useState<SortDirection>('desc')

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

  const sorted = useMemo(() => sortByKey(users, sortKey, direction, extract), [users, sortKey, direction])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader subtitle="Create and manage permission-based admin accounts" />
        <Button onClick={() => setModal({ mode: 'create' })}>Create admin</Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {!loading && users.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">{users.length} admin users</p>
          <SortControl
            options={SORT_OPTIONS}
            sortKey={sortKey}
            direction={direction}
            onChange={(key, dir) => {
              setSortKey(key)
              setDirection(dir)
            }}
          />
        </div>
      )}

      {loading ? (
        <AdminListRowSkeleton count={4} />
      ) : users.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">No admin users yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((user) => (
            <Card key={user.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Avatar name={user.full_name || user.username} />
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
