import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { fetchNotifications, markNotificationsRead } from '../api/services'
import { getToken } from '../api/client'
import { resolveNotificationHref } from '../lib/notificationLinks'
import type { NotificationItem } from '../types/notification'
import { useAuth } from './AuthContext'

const TOAST_TTL_MS = 8000

type NotificationContextValue = {
  notifications: NotificationItem[]
  toasts: NotificationItem[]
  unreadCount: number
  connected: boolean
  markAllRead: () => Promise<void>
  dismissToast: (id: number | string) => void
  refresh: () => Promise<void>
  enrichNotification: (item: NotificationItem) => NotificationItem
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

function wsUrl(token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/notifications/?token=${encodeURIComponent(token)}`
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [toasts, setToasts] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const roleRef = useRef(user?.role ?? 'customer')

  roleRef.current = user?.role ?? 'customer'

  const enrichNotification = useCallback((item: NotificationItem): NotificationItem => {
    const role = roleRef.current
    return {
      ...item,
      href: item.href ?? resolveNotificationHref(item.title, role),
    }
  }, [])

  const pushToast = useCallback(
    (item: NotificationItem) => {
      const enriched = enrichNotification(item)
      setToasts((prev) => [enriched, ...prev].slice(0, 5))
      const id = enriched.id
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, TOAST_TTL_MS)
    },
    [enrichNotification],
  )

  const dismissToast = useCallback((id: number | string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return
    const res = await fetchNotifications()
    setNotifications(res.notifications.map(enrichNotification))
    setUnreadCount(res.unread_count)
  }, [isAuthenticated, enrichNotification])

  const markAllRead = useCallback(async () => {
    await markNotificationsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)
    await refresh()
  }, [refresh])

  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([])
      setToasts([])
      setUnreadCount(0)
      setConnected(false)
      return
    }

    refresh().catch(() => {})

    const token = getToken()
    if (!token) return

    const ws = new WebSocket(wsUrl(token))
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { title: string; message: string }
        const item: NotificationItem = enrichNotification({
          id: `ws-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          title: data.title,
          message: data.message,
          is_read: false,
          created_at: new Date().toISOString(),
        })
        setNotifications((prev) => [item, ...prev])
        setUnreadCount((c) => c + 1)
        pushToast(item)
      } catch {
        /* ignore */
      }
    }

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [isAuthenticated, refresh, enrichNotification, pushToast])

  const value = useMemo(
    () => ({
      notifications,
      toasts,
      unreadCount,
      connected,
      markAllRead,
      dismissToast,
      refresh,
      enrichNotification,
    }),
    [notifications, toasts, unreadCount, connected, markAllRead, dismissToast, refresh, enrichNotification],
  )

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return ctx
}
