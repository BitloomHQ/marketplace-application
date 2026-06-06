import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLogo } from '../../components/auth/AuthLogo'
import { useAuth } from '../../context/AuthContext'
import { isProviderRole, providerDashboardPath } from '../../lib/format'
import { Button } from '../../components/ui'

function RoleCard({
  icon,
  title,
  description,
  cta,
  to,
}: {
  icon: React.ReactNode
  title: string
  description: string
  cta: string
  to: string
}) {
  return (
    <article className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-white">
          {icon}
        </span>
        <div>
          <h2 className="font-bold text-zinc-900">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500">{description}</p>
        </div>
      </div>
      <Link to={to} className="mt-5 block">
        <Button className="w-full !rounded-full !bg-sky-600 py-3 font-bold hover:!bg-sky-700">
          {cta}
        </Button>
      </Link>
    </article>
  )
}

export function AuthLandingPage() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (user.role === 'customer') navigate('/customer-dashboard', { replace: true })
    else if (isProviderRole(user.role)) navigate(providerDashboardPath(user.role), { replace: true })
  }, [isAuthenticated, user, navigate])

  return (
    <>
      <div className="rounded-[1.75rem] border border-zinc-100 bg-white px-6 py-8 shadow-xl shadow-zinc-300/25 sm:px-8 sm:py-10 style={{ backgroundImage: `url(${backgroundImage})` }}">
        <AuthLogo />
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900">
          How would you like to continue?
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-zinc-500">
          Choose your role and enjoy a seamless service experience.
        </p>

        <div className="mt-8 space-y-4">
          <RoleCard
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            }
            title="Book a service"
            description="Find trusted experts for cleaning, repairs, and home needs whenever you need them."
            cta="Continue as customer"
            to="/customer/login"
          />
          <RoleCard
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
            title="Offer your skills"
            description="Connect with customers, manage bookings, and grow your service business."
            cta="Continue as professional"
            to="/provider/login"
          />
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-zinc-400">
        Copyright @bitloom{' '}
        <span className="text-zinc-300">|</span>{' '}
        <a href="#" className="hover:text-sky-600">
          Privacy Policy
        </a>
      </p>
    </>
  )
}
