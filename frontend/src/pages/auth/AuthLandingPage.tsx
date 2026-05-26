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
    <div className="w-full max-w-2xl space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">
          Home<span className="text-violet-400">Services</span>
        </h1>
        <p className="mt-2 text-slate-400">Book home services or offer your skills</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col">
          <div className="mb-1 text-violet-400 text-sm font-medium">For homeowners</div>
          <h2 className="text-xl font-semibold text-white">Customer</h2>
          <p className="mt-2 flex-1 text-sm text-slate-400">
            Post service requests, compare quotes, and manage bookings.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/customer/login">
              <Button className="w-full">Customer sign in</Button>
            </Link>
            <Link to="/customer/register">
              <Button variant="secondary" className="w-full">
                Create customer account
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col">
          <div className="mb-1 text-emerald-400 text-sm font-medium">For professionals</div>
          <h2 className="text-xl font-semibold text-white">Provider</h2>
          <p className="mt-2 flex-1 text-sm text-slate-400">
            View leads, send quotes, and manage jobs as a plumber, electrician, or gardener.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/provider/login">
              <Button className="w-full">Provider sign in</Button>
            </Link>
            <Link to="/provider/register">
              <Button variant="secondary" className="w-full">
                Create provider account
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
