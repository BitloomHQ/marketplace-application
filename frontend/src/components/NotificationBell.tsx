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
  const { notifications, unreadCount, connected, markAllRead, dismissToast } = useNotifications()
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
        className="relative rounded-lg p-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
        aria-label="Notifications"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
        <span
          className={`absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-600'}`}
          title={connected ? 'Live updates on' : 'Reconnecting…'}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <h3 className="font-semibold text-white">Notifications</h3>
            {notifications.length > 0 && unreadCount > 0 && (
              <Button
                variant="ghost"
                className="text-xs py-1 px-2"
                disabled={marking}
                onClick={handleMarkAllRead}
              >
                {marking ? 'Saving…' : 'Mark all read'}
              </Button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet</li>
            ) : (
              notifications.map((n) => (
                <li key={n.id} className="border-b border-slate-800/80 last:border-0">
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full px-4 py-3 text-left transition hover:bg-slate-800 ${n.is_read === false ? 'bg-violet-600/5' : ''}`}
                  >
                    <p className="font-medium text-sm text-white">{n.title}</p>
                    <p className="mt-0.5 text-sm text-slate-400">{n.message}</p>
                    <p className="mt-1 text-xs text-violet-400/80">Tap to open</p>
                    <p className="mt-0.5 text-xs text-slate-600">{formatTime(n.created_at)}</p>
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
