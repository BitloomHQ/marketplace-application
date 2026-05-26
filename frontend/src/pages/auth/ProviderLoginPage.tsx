import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError } from '../../api/client'
import { AuthPortalLinks } from '../../components/AuthPortalLinks'
import { Alert, Button, Card, Field, Input, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { isProviderRole, providerDashboardPath } from '../../lib/format'

export function ProviderLoginPage() {
  const { login, logout, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      navigate(providerDashboardPath(res.user.role), { replace: true })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <PageHeader title="Provider sign in" subtitle="Plumbers, electricians, and gardeners" />
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="provider@email.com"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in as provider'}
        </Button>
      </form>
      <AuthPortalLinks portal="provider" />
    </Card>
  )
}
