import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError } from '../../api/client'
import { AuthPortalLinks } from '../../components/AuthPortalLinks'
import { Alert, Button, Card, Field, Input, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { isProviderRole } from '../../lib/format'

export function CustomerLoginPage() {
  const { login, logout, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (user.role === 'customer') navigate('/customer-dashboard', { replace: true })
    else if (isProviderRole(user.role)) navigate('/provider/login', { replace: true })
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      if (res.user.role !== 'customer') {
        logout()
        setError('This account is registered as a provider. Please use provider sign in.')
        return
      }
      navigate('/customer-dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <PageHeader title="Customer sign in" subtitle="Book plumbers, electricians, and gardeners" />
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
            placeholder="you@email.com"
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
          {loading ? 'Signing in…' : 'Sign in as customer'}
        </Button>
      </form>
      <AuthPortalLinks portal="customer" />
    </Card>
  )
}
