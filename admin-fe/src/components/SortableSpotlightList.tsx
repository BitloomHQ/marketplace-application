import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { EditIcon, IconActionButton, TrashIcon } from './IconActionButton'
import { Badge, Button, Card, Switch } from './ui'
import { resolveMediaUrl } from '../lib/media'
import type { AdminSpotlight } from '../api/admin'

function DragHandleIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
    </svg>
  )
}

function orderKey(items: AdminSpotlight[]) {
  return items.map((item) => item.id).join(',')
}

type Props = {
  spotlights: AdminSpotlight[]
  disabled?: boolean
  onEdit: (spotlight: AdminSpotlight) => void
  onDelete: (spotlight: AdminSpotlight) => void
  onToggleActive: (spotlight: AdminSpotlight) => void
  onReorder: (spotlights: AdminSpotlight[]) => Promise<void>
}

export function SortableSpotlightList({
  spotlights,
  disabled = false,
  onEdit,
  onDelete,
  onToggleActive,
  onReorder,
}: Props) {
  const [items, setItems] = useState(spotlights)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  useEffect(() => {
    setItems(spotlights)
  }, [spotlights])

  const hasChanges = useMemo(() => orderKey(items) !== orderKey(spotlights), [items, spotlights])

  const moveItem = (fromId: number, toId: number) => {
    const fromIndex = items.findIndex((item) => item.id === fromId)
    const toIndex = items.findIndex((item) => item.id === toId)
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return items

    const next = [...items]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    return next
  }

  const handleDrop = (targetId: number) => {
    if (draggingId == null || draggingId === targetId || disabled || saving) return
    const next = moveItem(draggingId, targetId)
    if (next === items) return
    setItems(next)
    setDraggingId(null)
    setOverId(null)
  }

  const handleSaveOrder = async () => {
    if (!hasChanges || saving) return
    setSaving(true)
    try {
      await onReorder(items)
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (spotlight: AdminSpotlight) => {
    setTogglingId(spotlight.id)
    try {
      await onToggleActive(spotlight)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Drag spotlights to change their display order on the customer homepage.
        </p>
        {hasChanges && (
          <Button onClick={() => void handleSaveOrder()} disabled={disabled || saving}>
            {saving ? 'Saving order…' : 'Save order'}
          </Button>
        )}
      </div>

      {items.map((spotlight, index) => {
        const isDragging = draggingId === spotlight.id
        const isOver = overId === spotlight.id && draggingId !== spotlight.id
        const thumb = resolveMediaUrl(spotlight.image_url ?? spotlight.image)

        return (
          <div
            key={spotlight.id}
            draggable={!disabled && !saving}
            onDragStart={() => setDraggingId(spotlight.id)}
            onDragEnd={() => {
              setDraggingId(null)
              setOverId(null)
            }}
            onDragOver={(e: DragEvent) => {
              e.preventDefault()
              setOverId(spotlight.id)
            }}
            onDrop={(e: DragEvent) => {
              e.preventDefault()
              handleDrop(spotlight.id)
            }}
            className={disabled || saving ? undefined : 'cursor-grab active:cursor-grabbing'}
          >
            <Card
              className={`flex flex-wrap items-center justify-between gap-3 transition ${
                isDragging ? 'opacity-50' : ''
              } ${isOver ? 'ring-2 ring-sky-300' : ''}`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <button
                  type="button"
                  className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-400"
                  aria-label={`Drag to reorder ${spotlight.title}`}
                  tabIndex={-1}
                >
                  <DragHandleIcon />
                </button>

                <span className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">
                  {index + 1}
                </span>

                {thumb ? (
                  <img src={thumb} alt="" className="h-14 w-20 shrink-0 rounded-xl object-cover ring-1 ring-zinc-200" />
                ) : (
                  <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs text-zinc-400 ring-1 ring-zinc-200">
                    No image
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-zinc-900">{spotlight.title}</p>
                    <Badge tone={spotlight.is_active ? 'success' : 'neutral'}>
                      {spotlight.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {spotlight.subtitle && (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{spotlight.subtitle}</p>
                  )}
                  {spotlight.redirect_url && (
                    <p className="mt-1 truncate text-xs text-zinc-400">{spotlight.redirect_url}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={spotlight.is_active}
                  onChange={() => void handleToggle(spotlight)}
                  disabled={togglingId === spotlight.id}
                  label={spotlight.is_active ? 'Deactivate' : 'Activate'}
                />
                <IconActionButton label="Edit spotlight" onClick={() => onEdit(spotlight)}>
                  <EditIcon />
                </IconActionButton>
                <IconActionButton label="Delete" variant="dangerSolid" onClick={() => onDelete(spotlight)}>
                  <TrashIcon />
                </IconActionButton>
              </div>
            </Card>
          </div>
        )
      })}
    </div>
  )
}
