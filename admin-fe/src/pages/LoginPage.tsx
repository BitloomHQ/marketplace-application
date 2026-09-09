import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError } from '../api/client'
import { useAdminAuth } from '../context/AdminAuthContext'
import { Alert, Button, Card, Field, Input } from '../components/ui'
import logo from '/logo.png'

function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const code = (err.data as { code?: string } | null)?.code
    if (code === 'MARKETPLACE_LOGIN_NOT_ALLOWED') {
      return 'This looks like a customer or provider account — please sign in through the main ZepServe app instead.'
    }
    if (code === 'ADMIN_ACCOUNT_INACTIVE') {
      return 'This admin account is inactive. Contact a super admin.'
    }
    return err.message
  }
  return 'Login failed'
}

export function LoginPage() {
  const { login } = useAdminAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <img src={logo} alt="" className="h-12 w-12 rounded-xl" />
          <h1 className="text-xl font-bold text-zinc-900">
            Zep<span className="text-violet-600">Serve</span> Admin
          </h1>
          <p className="text-sm text-zinc-500">Sign in to manage the marketplace.</p>
        </div>

        <Card>
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
                autoFocus
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
        </Card>
      </div>
    </div>
  )
}
