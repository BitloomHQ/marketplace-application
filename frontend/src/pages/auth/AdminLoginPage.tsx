import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError } from '../../api/client'
import { AuthLoginShell } from '../../components/auth/AuthLoginShell'
import { Alert, Button, Field, Input } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const REMEMBER_KEY = 'hs_remember_admin_email'

export function AdminLoginPage() {
  const { login: authLogin, logout, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [remember] = useState(() => !!localStorage.getItem(REMEMBER_KEY))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (user.role === 'admin') navigate('/admin-dashboard', { replace: true })
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authLogin(email, password)
      if (res.user.role !== 'admin') {
        logout()
        setError('This account is not an admin user.')
        return
      }
      if (remember) localStorage.setItem(REMEMBER_KEY, email)
      else localStorage.removeItem(REMEMBER_KEY)
      navigate('/admin-dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLoginShell
      title="Admin sign in"
      subtitle="Platform management access for marketplace operators."
      footer={null}
    >
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
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLoginShell>
  )
}
