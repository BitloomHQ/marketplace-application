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
    <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            if (t.href) navigate(t.href)
            dismissToast(t.id)
          }}
          className="pointer-events-auto w-full rounded-xl border border-slate-700 bg-slate-900/95 p-4 text-left shadow-2xl backdrop-blur transition hover:border-violet-500/50 hover:bg-slate-800"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-white">{t.title}</p>
            <span className="shrink-0 text-xs text-slate-500">{formatTime(t.created_at)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-400 line-clamp-2">{t.message}</p>
          <p className="mt-2 text-xs text-violet-400">Click to view →</p>
        </button>
      ))}
    </div>
  )
}
