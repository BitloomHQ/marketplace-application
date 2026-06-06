import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError } from '../../api/client'
import { AuthLoginShell } from '../../components/auth/AuthLoginShell'
import { AuthPortalLinks } from '../../components/AuthPortalLinks'
import { Alert, Button, Field, Input } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { isProviderRole, providerDashboardPath } from '../../lib/format'

const REMEMBER_KEY = 'hs_remember_provider_email'

export function ProviderLoginPage() {
  const { login, logout, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBER_KEY))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (isProviderRole(user.role)) navigate(providerDashboardPath(user.role), { replace: true })
    else if (user.role === 'customer') navigate('/customer/login', { replace: true })
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      if (!isProviderRole(res.user.role)) {
        logout()
        setError('This account is registered as a customer. Please use customer sign in.')
        return
      }
      if (remember) localStorage.setItem(REMEMBER_KEY, email)
      else localStorage.removeItem(REMEMBER_KEY)
      navigate(providerDashboardPath(res.user.role), { replace: true })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLoginShell
      title="Welcome back, pro"
      subtitle="Sign in to manage jobs, send quotes, and grow your service business"
      footer={<AuthPortalLinks portal="provider" />}
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email address">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email address"
            className="!rounded-xl"
          />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700">Password</span>
            <button
              type="button"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
              onClick={() => setError('Password reset is not available yet. Contact support.')}
            >
              Forgot password
            </button>
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password here"
            className="!rounded-xl"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/30"
          />
          Remember this device
        </label>

        <Button
          type="submit"
          className="w-full !rounded-full !bg-sky-600 py-3.5 text-base font-bold shadow-md shadow-sky-600/25 hover:!bg-sky-700"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Submit'}
        </Button>
      </form>
    </AuthLoginShell>
  )
}
