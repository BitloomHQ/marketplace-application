import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import backgroundImage from '../../assets/bg.png'
import { fetchMyBookings, fetchProfile, fetchProviderLeads } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { providerDeactivationReason } from '../../lib/providerStatus'
import { Alert, SectionTitle } from '../../components/ui'

function StatCard({
  title,
  description,
  value,
  tone,
  watermark,
}: {
  title: string
  description: string
  value: number
  tone: 'amber' | 'violet'
  watermark: React.ReactNode
}) {
  const styles = {
    amber: {
      card: 'border-amber-100/80 bg-amber-50/90',
      title: 'text-zinc-900',
      desc: 'text-zinc-600',
      value: 'text-amber-700',
    },
    violet: {
      card: 'border-violet-100/80 bg-violet-50/90',
      title: 'text-zinc-900',
      desc: 'text-zinc-600',
      value: 'text-violet-700',
    },
  }[tone]

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${styles.card}`}
    >
      <div className="relative z-10 max-w-[70%]">
        <h3 className={`text-sm font-bold sm:text-base ${styles.title}`}>{title}</h3>
        <p className={`mt-1 text-xs leading-relaxed sm:text-sm ${styles.desc}`}>{description}</p>
        <p className={`mt-3 text-3xl font-bold sm:text-4xl ${styles.value}`}>{value}</p>
      </div>
      <div className="pointer-events-none absolute -bottom-2 -right-1 opacity-[0.18]">
        {watermark}
      </div>
    </article>
  )
}

function ArrowButton() {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white shadow-md shadow-sky-600/30 transition group-hover:bg-sky-700">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </span>
  )
}

function QuickActionCard({
  to,
  icon,
  title,
  subtitle,
}: {
  to: string
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-zinc-900">{title}</p>
        <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
      </div>
      <ArrowButton />
    </Link>
  )
}

export function ProviderDashboard() {
  const { user, setUser } = useAuth()
  const [newJobs, setNewJobs] = useState(0)
  const [activeJobs, setActiveJobs] = useState(0)

  const firstName = user?.username?.split(' ')[0] ?? 'Pro'
  const pendingApproval = user?.is_approved === false
  const deactivated = user?.is_active === false
  const deactivationReason = providerDeactivationReason(user)

  useEffect(() => {
    fetchProfile()
      .then((res) => setUser(res.user))
      .catch(() => {})
  }, [setUser])

  useEffect(() => {
    if (pendingApproval || deactivated) return

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
  }, [pendingApproval, deactivated])

  return (
    <div className="space-y-8">
      {pendingApproval && (
        <Alert variant="info">
          Your provider account is pending admin approval. You can view your dashboard, but leads and
          quotes will unlock after an admin verifies your account.
        </Alert>
      )}
      {deactivated && (
        <Alert variant="error">
          Your provider account is deactivated
          {deactivationReason ? `: ${deactivationReason}` : '.'}
        </Alert>
      )}
      <section className="relative h-80 rounded-[1.75rem] px-5 py-6 sm:px-7 sm:py-8 text-white bg-cover bg-center" style={{ backgroundImage: `url(${backgroundImage})` }}>
        <div className="relative z-10 flex sm:items-center sm:justify-between">
          <div className="w-full relative">
            <p className="inline-flex items-center gap-2 text-base font-medium text-sky-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs">
                👋
              </span>
              Hello, {firstName}
            </p>
            <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
              Trusted home experts, one tap away
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-sky-100/90 sm:text-[15px]">
              Book verified professionals for repairs, maintenance, and everyday home needs —
              reliable service delivered right to your doorstep.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          title="New jobs available"
          description="Find nearby requests and accept jobs that match your skills."
          value={newJobs}
          tone="amber"
          watermark={
            <svg className="h-28 w-28" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 12h8v2H8v-2zm0 4h5v2H8v-2z" />
            </svg>
          }
        />
        <StatCard
          title="Active visits"
          description="Manage your ongoing jobs and track upcoming visits."
          value={activeJobs}
          tone="violet"
          watermark={
            <svg className="h-28 w-28" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z" />
            </svg>
          }
        />
      </div>

      <section>
        <SectionTitle subtitle="Access important tools to manage jobs and schedules faster">
          Quick actions
        </SectionTitle>
        <div className="space-y-3">
          <QuickActionCard
            to="/provider/leads"
            title="Find new jobs"
            subtitle="Browse requests, photos & lawn maps"
            icon={
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 6V8a2 2 0 00-2-2H8a2 2 0 00-2 2v4" />
              </svg>
            }
          />
          <QuickActionCard
            to="/provider/bookings"
            title="My schedule"
            subtitle="Confirmed jobs & visit status"
            icon={
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>
      </section>
    </div>
  )
}
