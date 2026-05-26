import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function ProviderDashboard() {
  const { user } = useAuth()
  const firstName = user?.username?.split(' ')[0] ?? 'Pro'

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-zinc-900 px-5 py-6 text-white">
        <p className="text-sm text-zinc-400">Partner app</p>
        <h1 className="mt-1 text-2xl font-bold">Hi, {firstName}</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Pick up jobs near you, send quotes, and manage your schedule.
        </p>
      </section>

      <div className="grid gap-3">
        <Link
          to="/provider/leads"
          className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-2xl">
            💼
          </span>
          <div className="flex-1">
            <p className="font-bold text-zinc-900">Find new jobs</p>
            <p className="text-sm text-zinc-500">Browse customer requests & send quotes</p>
          </div>
          <span className="text-violet-600">→</span>
        </Link>

        <Link
          to="/provider/bookings"
          className="flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
            📅
          </span>
          <div className="flex-1">
            <p className="font-bold text-zinc-900">My schedule</p>
            <p className="text-sm text-zinc-500">Confirmed jobs & visit status</p>
          </div>
          <span className="text-violet-600">→</span>
        </Link>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-center text-sm text-zinc-500">
        Tip: Respond quickly to new jobs — customers often book the first good quote.
      </div>
    </div>
  )
}
