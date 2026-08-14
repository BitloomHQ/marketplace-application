import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { Button } from './ui'
import type { NotificationItem } from '../types/notification'

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

type PanelProps = {
  open: boolean
  onClose: () => void
  anchorRef: React.RefObject<HTMLButtonElement | null>
  notifications: NotificationItem[]
  unreadCount: number
  marking: boolean
  onMarkAllRead: (e: React.MouseEvent) => void
  onNotificationClick: (n: NotificationItem) => void
}

function NotificationPanel({
  open,
  onClose,
  anchorRef,
  notifications,
  unreadCount,
  marking,
  onMarkAllRead,
  onNotificationClick,
}: PanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [style, setStyle] = useState<{ top: number; left: number; width: number } | null>(null)

  useEffect(() => {
    if (!open) return

    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.left = '0'
    document.body.style.right = '0'
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
      window.scrollTo(0, scrollY)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const anchor = anchorRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      const viewportPadding = 12
      const panelWidth = Math.min(384, window.innerWidth - viewportPadding * 2)
      const isMobile = window.innerWidth < 640

      if (isMobile) {
        setStyle({
          top: rect.bottom + 8,
          left: viewportPadding,
          width: window.innerWidth - viewportPadding * 2,
        })
        return
      }

      const left = Math.max(
        viewportPadding,
        Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - viewportPadding),
      )

      setStyle({
        top: rect.bottom + 8,
        left,
        width: panelWidth,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, anchorRef])

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        panelRef.current?.contains(target) ||
        anchorRef.current?.contains(target)
      ) {
        return
      }
      onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose, anchorRef])

  if (!open || !style) return null

  const listMaxHeight = Math.min(window.innerHeight * 0.6, window.innerHeight - style.top - 72)

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[99] bg-black/20 lg:bg-transparent"
        aria-label="Close notifications"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="fixed z-[100] flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl"
        style={{
          top: style.top,
          left: style.left,
          width: style.width,
          maxHeight: `min(70vh, calc(100vh - ${style.top}px - 12px))`,
        }}
        role="dialog"
        aria-label="Notifications"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-3">
          <h3 className="font-bold text-zinc-900">Updates</h3>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button
              variant="ghost"
              className="py-1 text-xs"
              disabled={marking}
              onClick={onMarkAllRead}
            >
              {marking ? '…' : 'Clear all'}
            </Button>
          )}
        </div>
        <ul
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
          style={{ maxHeight: listMaxHeight }}
        >
        {notifications.length === 0 ? (
          <li className="px-4 py-10 text-center text-sm text-zinc-400">No updates yet</li>
        ) : (
          notifications.map((n) => (
            <li key={n.id} className="border-b border-zinc-50 last:border-0">
              <button
                type="button"
                onClick={() => onNotificationClick(n)}
                className={`w-full px-4 py-3 text-left transition hover:bg-zinc-50 ${n.is_read === false ? 'bg-violet-50/50' : ''}`}
              >
                <p className="text-sm font-semibold text-zinc-900">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">{n.message}</p>
                <p className="mt-1 text-xs text-zinc-400">{formatTime(n.created_at)}</p>
              </button>
            </li>
          ))
        )}
      </ul>
      </div>
    </>,
    document.body,
  )
}

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, dismissToast } = useNotifications()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setMarking(true)
    try {
      await markAllRead()
    } finally {
      setMarking(false)
    }
  }

  const handleNotificationClick = (n: NotificationItem) => {
    if (n.href) navigate(n.href)
    dismissToast(n.id)
    setOpen(false)
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative shrink-0 rounded-full p-1.5 text-zinc-600 transition hover:bg-zinc-100 sm:p-2"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationPanel
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={buttonRef}
        notifications={notifications}
        unreadCount={unreadCount}
        marking={marking}
        onMarkAllRead={handleMarkAllRead}
        onNotificationClick={handleNotificationClick}
      />
    </>
  )
}
