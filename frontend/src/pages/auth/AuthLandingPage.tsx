import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { isProviderRole, providerDashboardPath } from '../../lib/format'
import { Button, Card } from '../../components/ui'

export function AuthLandingPage() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (user.role === 'customer') navigate('/customer-dashboard', { replace: true })
    else if (isProviderRole(user.role)) navigate(providerDashboardPath(user.role), { replace: true })
  }, [isAuthenticated, user, navigate])

  return (
    <div className="space-y-8">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-xl font-bold text-white shadow-lg shadow-violet-600/30">
          HS
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">HomeServices</h1>
        <p className="mt-2 text-zinc-500">Trusted home help, on demand</p>
      </div>

      <div className="grid gap-4">
        <Card className="flex flex-col border-violet-100 bg-gradient-to-br from-white to-violet-50/50">
          <span className="text-2xl">🏠</span>
          <h2 className="mt-3 text-xl font-bold text-zinc-900">I need a service</h2>
          <p className="mt-2 flex-1 text-sm text-zinc-500">
            Book plumbers, electricians & gardeners. Compare quotes and schedule in minutes.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/customer/login">
              <Button className="w-full">Continue as customer</Button>
            </Link>
            <Link to="/customer/register">
              <Button variant="secondary" className="w-full">
                Create account
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col">
          <span className="text-2xl">🛠️</span>
          <h2 className="mt-3 text-xl font-bold text-zinc-900">I&apos;m a professional</h2>
          <p className="mt-2 flex-1 text-sm text-zinc-500">
            Get jobs near you, send quotes, and manage your schedule on the go.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/provider/login">
              <Button className="w-full">Partner sign in</Button>
            </Link>
            <Link to="/provider/register">
              <Button variant="secondary" className="w-full">
                Join as a pro
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
