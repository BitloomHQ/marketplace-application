import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiRequestError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { isProviderRole } from '../../lib/format'
import { Alert, Button, Field, Input, Modal } from '../ui'

const REMEMBER_KEY = 'hs_remember_email'

type Props = {
  open: boolean
  onClose: () => void
  subtitle?: string
}

export function LoginModal({
  open,
  onClose,
  subtitle = 'Before you book a service, please log in first.',
}: Props) {
  const { login, logout, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBER_KEY))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !isAuthenticated || !user) return
    onClose()
    if (user.role === 'customer') navigate('/customer-dashboard', { replace: true })
    else if (isProviderRole(user.role)) navigate('/provider-dashboard', { replace: true })
    else if (user.role === 'admin') navigate('/admin-dashboard', { replace: true })
  }, [open, isAuthenticated, user, navigate, onClose])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      if (res.user.role === 'admin') {
        logout()
        setError('This account is an admin. Please use the admin portal.')
        return
      }
      if (res.user.role !== 'customer') {
        logout()
        setError('This account is registered as a provider. Please use the partner portal.')
        return
      }
      if (remember) localStorage.setItem(REMEMBER_KEY, email)
      else localStorage.removeItem(REMEMBER_KEY)
      onClose()
      navigate('/customer-dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const data = err.data as {
          code?: string
          data?: { email?: string }
        }
        if (data.code === 'EMAIL_NOT_VERIFIED' && data.data?.email) {
          onClose()
          navigate('/verify-email', {
            state: { email: data.data.email, portal: 'customer' },
          })
          return
        }
        setError(err.message)
      } else setError('Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Login to continue" subtitle={subtitle}>
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

        <Field
          label="Password"
          action={
            <Link
              to="/forgot-password"
              onClick={onClose}
              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              Forgot password?
            </Link>
          }
        >
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password here"
            className="!rounded-xl"
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-sky-600 focus:ring-sky-500/30"
          />
          Remember me
        </label>

        <Button
          type="submit"
          className="w-full !rounded-full !bg-sky-600 py-3.5 text-base font-bold shadow-md shadow-sky-600/25 hover:!bg-sky-700"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Submit'}
        </Button>

        <p className="text-center text-sm text-zinc-500">
          Don&apos;t have an account?{' '}
          <Link
            to="/customer/register"
            onClick={onClose}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Sign up
          </Link>
        </p>
      </form>
    </Modal>
  )
}
