import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchActiveServices, register } from '../api/accounts'
import { ApiRequestError } from '../api/client'
import { GuestHeader } from '../components/GuestHeader'
import { SiteFooter } from '../components/SiteFooter'
import { AuthRegisterShell } from '../components/auth/AuthRegisterShell'
import { Alert, Button, Field, Input, Modal, Select } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { isProviderRole } from '../lib/format'
import type { ActiveService } from '../types'
import heroImage from '../assets/hero.png'

const REMEMBER_KEY = 'hs_partner_remember_email'

function ProviderLoginModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => localStorage.getItem(REMEMBER_KEY) ?? '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => !!localStorage.getItem(REMEMBER_KEY))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login(email, password)
      if (res.user.role === 'customer') {
        logout()
        setError('This account is a customer account. Please use customer login.')
        return
      }
      if (res.user.role === 'admin') {
        logout()
        setError('Admin accounts must use the admin portal.')
        return
      }
      if (remember) localStorage.setItem(REMEMBER_KEY, email)
      else localStorage.removeItem(REMEMBER_KEY)
      onClose()
      navigate('/provider-dashboard', { replace: true })
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const data = err.data as { code?: string; data?: { email?: string } }
        if (data.code === 'EMAIL_NOT_VERIFIED' && data.data?.email) {
          onClose()
          navigate('/verify-email', {
            state: { email: data.data.email, portal: 'provider' },
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
    <Modal open={open} onClose={onClose} title="Partner login" subtitle="Sign in to manage your jobs and bookings.">
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
            <Link to="/forgot-password" onClick={onClose} className="text-xs font-semibold text-sky-600">
              Forgot password?
            </Link>
          }
        >
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
            className="!rounded-xl"
          />
        </Field>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-sky-600"
          />
          Remember me
        </label>
        <Button
          type="submit"
          className="w-full !rounded-full !bg-sky-600 py-3.5 font-bold hover:!bg-sky-700"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Submit'}
        </Button>
        <p className="text-center text-sm text-zinc-500">
          New partner?{' '}
          <button
            type="button"
            onClick={onClose}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Register below
          </button>
        </p>
      </form>
    </Modal>
  )
}

export function PartnerLandingPage() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [services, setServices] = useState<ActiveService[]>([])
  const [serviceType, setServiceType] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingServices, setLoadingServices] = useState(true)
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (isProviderRole(user.role)) navigate('/provider-dashboard', { replace: true })
    else if (user.role === 'customer') navigate('/customer-dashboard', { replace: true })
    else if (user.role === 'admin') navigate('/admin-dashboard', { replace: true })
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    fetchActiveServices()
      .then((res) => {
        setServices(res.services)
        if (res.services[0]) setServiceType(res.services[0].key)
      })
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false))
  }, [])

  useEffect(() => {
    if (searchParams.get('login') === '1') {
      setLoginOpen(true)
      searchParams.delete('login')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await register({ ...form, role: serviceType })
      navigate('/verify-email', {
        state: { email: res.data.email, portal: 'provider' },
      })
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err.message)
      else setError('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <GuestHeader onLoginClick={() => setLoginOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        <section className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-600">
              Partner program
            </p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-zinc-900 sm:text-4xl">
              Grow your service business with HomeServices
            </h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-600">
              Join verified professionals on our platform. Receive job leads, send quotes, manage
              bookings, and build your reputation — all in one place.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-zinc-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-sky-600">✓</span>
                Get matched with customers in your service area
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-sky-600">✓</span>
                Manage leads, quotes, and schedules from one dashboard
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-sky-600">✓</span>
                Build trust with verified profiles and customer reviews
              </li>
            </ul>
            <img
              src={heroImage}
              alt=""
              className="mt-8 w-full max-w-md rounded-2xl object-cover shadow-lg lg:hidden"
            />
          </div>

          <div id="register">
            <AuthRegisterShell
              title="Register as a partner"
              subtitle="Create your professional account — we'll review and approve your profile."
              backTo="/"
              backLabel="Back to customer home"
              footer={
                <p className="mt-6 text-center text-sm text-zinc-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => setLoginOpen(true)}
                    className="font-semibold text-sky-600 hover:text-sky-700"
                  >
                    Sign in here
                  </button>
                </p>
              }
            >
              {error && (
                <div className="mb-4">
                  <Alert variant="error">{error}</Alert>
                </div>
              )}
              <form onSubmit={handleRegister} className="space-y-4">
                <Field label="Service type" required>
                  <Select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                    disabled={loadingServices || services.length === 0}
                    className="!rounded-xl"
                  >
                    {loadingServices ? (
                      <option value="">Loading services…</option>
                    ) : services.length === 0 ? (
                      <option value="">No active services available</option>
                    ) : (
                      services.map((service) => (
                        <option key={service.id} value={service.key}>
                          {service.name}
                        </option>
                      ))
                    )}
                  </Select>
                </Field>
                <Field label="Full name" required>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Your full name"
                    className="!rounded-xl"
                  />
                </Field>
                <Field label="Email address" required>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder="Enter your email address"
                    className="!rounded-xl"
                  />
                </Field>
                <Field label="Password" required>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    placeholder="Create a password"
                    className="!rounded-xl"
                  />
                </Field>
                <Field label="Confirm password" required>
                  <Input
                    type="password"
                    value={form.confirm_password}
                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                    required
                    placeholder="Confirm your password"
                    className="!rounded-xl"
                  />
                </Field>
                <Button
                  type="submit"
                  className="w-full !rounded-full !bg-sky-600 py-3.5 text-base font-bold shadow-md hover:!bg-sky-700"
                  disabled={loading || loadingServices || services.length === 0}
                >
                  {loading ? 'Creating account…' : 'Create partner account'}
                </Button>
              </form>
            </AuthRegisterShell>
          </div>
        </section>
      </main>

      <ProviderLoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
      <SiteFooter />
    </div>
  )
}
