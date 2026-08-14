import { useEffect, useMemo, useState, type DragEvent } from 'react'
import {
  EditIcon,
  IconActionButton,
  TrashIcon,
} from '../IconActionButton'
import { Badge, Button, Card } from '../ui'
import { DEFAULT_SERVICE_IMAGE } from '../../lib/defaultServiceImage'
import { formatStatus } from '../../lib/format'
import { resolveMediaUrl } from '../../lib/media'
import type { ServiceCategory } from '../../types'

function serviceStatusTone(status: string): 'success' | 'warning' | 'neutral' {
  if (status === 'active') return 'success'
  if (status === 'coming_soon') return 'warning'
  return 'neutral'
}

function DragHandleIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 16a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
    </svg>
  )
}

function orderKey(services: ServiceCategory[]) {
  return services.map((service) => service.id).join(',')
}

type Props = {
  services: ServiceCategory[]
  disabled?: boolean
  onEdit: (service: ServiceCategory) => void
  onDelete: (service: ServiceCategory) => void
  onReorder: (services: ServiceCategory[]) => Promise<void>
}

export function SortableServiceList({
  services,
  disabled = false,
  onEdit,
  onDelete,
  onReorder,
}: Props) {
  const [items, setItems] = useState(services)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [overId, setOverId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setItems(services)
  }, [services])

  const hasChanges = useMemo(
    () => orderKey(items) !== orderKey(services),
    [items, services],
  )

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Drag services to change their display order on the customer homepage.
        </p>
        {hasChanges && (
          <Button onClick={() => void handleSaveOrder()} disabled={disabled || saving}>
            {saving ? 'Saving order…' : 'Save order'}
          </Button>
        )}
      </div>

      {items.map((service, index) => {
        const isDragging = draggingId === service.id
        const isOver = overId === service.id && draggingId !== service.id

        return (
          <div
            key={service.id}
            draggable={!disabled && !saving}
            onDragStart={() => setDraggingId(service.id ?? null)}
            onDragEnd={() => {
              setDraggingId(null)
              setOverId(null)
            }}
            onDragOver={(e: DragEvent) => {
              e.preventDefault()
              if (service.id != null) setOverId(service.id)
            }}
            onDrop={(e: DragEvent) => {
              e.preventDefault()
              if (service.id != null) handleDrop(service.id)
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
                  aria-label={`Drag to reorder ${service.name}`}
                  tabIndex={-1}
                >
                  <DragHandleIcon />
                </button>

                <span className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">
                  {index + 1}
                </span>

                <img
                  src={
                    service.service_image
                      ? resolveMediaUrl(service.service_image) ?? DEFAULT_SERVICE_IMAGE
                      : DEFAULT_SERVICE_IMAGE
                  }
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-zinc-200"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-zinc-900">{service.name}</p>
                    <Badge tone={serviceStatusTone(service.status)}>
                      {formatStatus(service.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{service.key}</p>
                  <p className="mt-1 text-sm text-zinc-600">{service.description}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <IconActionButton label="Edit service" onClick={() => onEdit(service)}>
                  <EditIcon />
                </IconActionButton>
                <IconActionButton
                  label="Delete"
                  variant="dangerSolid"
                  onClick={() => onDelete(service)}
                >
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
