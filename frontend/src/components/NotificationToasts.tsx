import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function NotificationToasts() {
  const { toasts, dismissToast } = useNotifications()
  const navigate = useNavigate()

  if (toasts.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 z-[100] flex w-full max-w-sm flex-col gap-2 bottom-tab-offset lg:bottom-4">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            if (t.href) navigate(t.href)
            dismissToast(t.id)
          }}
          className="pointer-events-auto w-full rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-lg transition hover:shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-zinc-900">{t.title}</p>
            <span className="shrink-0 text-xs text-zinc-400">{formatTime(t.created_at)}</span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-500">{t.message}</p>
          <p className="mt-2 text-xs font-semibold text-violet-600">Tap to open</p>
        </button>
      ))}
    </div>
  )
}
