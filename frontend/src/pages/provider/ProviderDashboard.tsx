import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchMyBookings, fetchProviderLeads } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { formatService, isProviderRole, providerDashboardPath } from '../../lib/format'
import { SERVICE_META } from '../../lib/serviceMeta'

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'sky' | 'emerald'
}) {
  const styles = {
    sky: 'border-sky-100 bg-sky-50 text-sky-900',
    emerald: 'border-emerald-100 bg-emerald-50 text-emerald-900',
  }
  const labelStyles = {
    sky: 'text-sky-600',
    emerald: 'text-emerald-600',
  }

  return (
    <div className={`rounded-2xl border px-4 py-4 ${styles[tone]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${labelStyles[tone]}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  )
}

export function ProviderDashboard() {
  const { user } = useAuth()
  const [newJobs, setNewJobs] = useState(0)
  const [activeJobs, setActiveJobs] = useState(0)

  const firstName = user?.username?.split(' ')[0] ?? 'Pro'
  const role = user && isProviderRole(user.role) ? user.role : 'plumber'
  const meta = SERVICE_META[role]

  useEffect(() => {
    Promise.all([fetchProviderLeads(), fetchMyBookings()])
      .then(([leadsRes, bookingsRes]) => {
        setNewJobs(leadsRes.leads.length)
        setActiveJobs(
          bookingsRes.bookings.filter(
            (b) => b.status !== 'completed' && b.status !== 'cancelled',
          ).length,
        )
      })
      .catch(() => {})
  }, [])

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 px-5 py-6 text-white shadow-xl sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 90% 15%, rgba(56,189,248,0.45) 0%, transparent 42%)',
          }}
        />
        <div className="relative z-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sky-100">
            <span>{meta.emoji}</span>
            {formatService(role)} partner
          </p>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Hi, {firstName}</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
            Pick up jobs near you, send quotes fast, and keep your schedule full — customers
            often book the first reliable pro who responds.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="New jobs" value={newJobs} tone="sky" />
        <StatCard label="Active visits" value={activeJobs} tone="emerald" />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-zinc-900 sm:text-xl">Quick actions</h2>

        <Link
          to="/provider/leads"
          className="group flex items-center gap-4 rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-2xl transition group-hover:bg-sky-200">
            💼
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-zinc-900">Find new jobs</p>
            <p className="text-sm text-zinc-500">Browse requests, photos & lawn maps</p>
          </div>
          <span className="text-sky-600">→</span>
        </Link>

        <Link
          to="/provider/bookings"
          className="group flex items-center gap-4 rounded-[1.25rem] border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-2xl transition group-hover:bg-emerald-200">
            📅
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-zinc-900">My schedule</p>
            <p className="text-sm text-zinc-500">Confirmed jobs & visit status</p>
          </div>
          <span className="text-emerald-600">→</span>
        </Link>
      </section>

      <div className="rounded-[1.25rem] border border-dashed border-sky-200 bg-sky-50/70 px-4 py-5 text-center">
        <p className="text-sm font-semibold text-sky-800">Pro tip</p>
        <p className="mt-1 text-sm text-sky-700/80">
          Respond within the first hour — jobs with lawn maps or photos convert faster when you
          quote with a clear price and timeline.
        </p>
        <Link
          to={providerDashboardPath(role)}
          className="mt-3 inline-block text-xs font-semibold text-sky-600 hover:underline"
        >
          Refresh dashboard →
        </Link>
      </div>
    </div>
  )
}
