import { useEffect, useRef, useState } from 'react'
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

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, dismissToast } = useNotifications()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [marking, setMarking] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

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
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-zinc-600 transition hover:bg-zinc-100"
        aria-label="Notifications"
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

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <h3 className="font-bold text-zinc-900">Updates</h3>
            {notifications.length > 0 && unreadCount > 0 && (
              <Button
                variant="ghost"
                className="py-1 text-xs"
                disabled={marking}
                onClick={handleMarkAllRead}
              >
                {marking ? '…' : 'Clear all'}
              </Button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-zinc-400">No updates yet</li>
            ) : (
              notifications.map((n) => (
                <li key={n.id} className="border-b border-zinc-50 last:border-0">
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-zinc-50 ${n.is_read === false ? 'bg-violet-50/50' : ''}`}
                  >
                    <p className="text-sm font-semibold text-zinc-900">{n.title}</p>
                    <p className="mt-0.5 text-sm text-zinc-500 line-clamp-2">{n.message}</p>
                    <p className="mt-1 text-xs text-zinc-400">{formatTime(n.created_at)}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
