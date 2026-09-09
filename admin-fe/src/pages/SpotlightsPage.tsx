import { useEffect, useState } from 'react'
import { deleteAdminSpotlight, fetchAdminSpotlights, updateAdminSpotlight, type AdminSpotlight } from '../api/admin'
import { ApiRequestError } from '../api/client'
import { SortableSpotlightList } from '../components/SortableSpotlightList'
import { SpotlightFormModal } from '../components/SpotlightFormModal'
import { Alert, Button, Card, PageHeader } from '../components/ui'
import { AdminListRowSkeleton } from '../components/Shimmer'

export function SpotlightsPage() {
  const [spotlights, setSpotlights] = useState<AdminSpotlight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<AdminSpotlight | null>(null)

  const load = () => {
    setLoading(true)
    setError('')
    fetchAdminSpotlights()
      .then((res) => setSpotlights(res.data))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load spotlights'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleEdit = (spotlight: AdminSpotlight) => {
    setEditTarget(spotlight)
    setFormOpen(true)
  }

  const handleCreate = () => {
    setEditTarget(null)
    setFormOpen(true)
  }

  const handleDelete = async (spotlight: AdminSpotlight) => {
    if (!confirm(`Delete "${spotlight.title}"? This removes it from the customer app immediately.`)) return
    setError('')
    try {
      await deleteAdminSpotlight(spotlight.id)
      load()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Delete failed')
    }
  }

  const handleToggleActive = async (spotlight: AdminSpotlight) => {
    setError('')
    try {
      const res = await updateAdminSpotlight(spotlight.id, { is_active: !spotlight.is_active })
      setSpotlights((prev) => prev.map((s) => (s.id === spotlight.id ? res.data : s)))
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update status')
    }
  }

  const handleReorder = async (next: AdminSpotlight[]) => {
    setError('')
    try {
      // No bulk reorder endpoint — persist each moved item's new display_order individually.
      await Promise.all(
        next.map((spotlight, index) =>
          spotlight.display_order === index + 1
            ? Promise.resolve()
            : updateAdminSpotlight(spotlight.id, { display_order: index + 1 }),
        ),
      )
      setSpotlights(next.map((spotlight, index) => ({ ...spotlight, display_order: index + 1 })))
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : 'Failed to update order'
      setError(message)
      throw new Error(message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader subtitle="Featured banners shown on the customer homepage" />
        <Button onClick={handleCreate}>Create spotlight</Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <AdminListRowSkeleton count={3} />
      ) : spotlights.length === 0 ? (
        <Card className="text-center text-sm text-zinc-500">
          No spotlight images yet. Create your first one to feature it on the customer homepage.
        </Card>
      ) : (
        <SortableSpotlightList
          spotlights={spotlights}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onReorder={handleReorder}
        />
      )}

      <SpotlightFormModal
        spotlight={editTarget}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
