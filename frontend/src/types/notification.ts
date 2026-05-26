export interface NotificationItem {
  id: number | string
  title: string
  message: string
  is_read?: boolean
  created_at: string
  href?: string
}

export interface WsNotificationPayload {
  title: string
  message: string
}
