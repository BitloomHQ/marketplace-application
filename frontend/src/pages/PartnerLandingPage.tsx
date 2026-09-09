import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { fetchRegisterableServices, registerableServiceLabel } from '../api/catalog'
import { register } from '../api/accounts'
import { ApiRequestError } from '../api/client'
import { GuestHeader } from '../components/GuestHeader'
import { SiteFooter } from '../components/SiteFooter'
import { AuthRegisterShell } from '../components/auth/AuthRegisterShell'
import { Alert, Button, EyeIcon, Field, IconInput, LockIcon, MailIcon, Modal, Select, UserIcon } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { isProviderRole } from '../lib/format'
import type { ServiceCategory } from '../types'
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
  const [showPassword, setShowPassword] = useState(false)
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
        if (data.code === 'ADMIN_LOGIN_NOT_ALLOWED') {
          setError('This is an admin account — please use the admin panel to sign in.')
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
          <IconInput
            icon={<MailIcon />}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email address"
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
          <IconInput
            icon={<LockIcon />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-zinc-400 transition hover:text-zinc-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                <EyeIcon off={showPassword} />
              </button>
            }
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your password"
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
        <Button type="submit" className="w-full py-3.5" disabled={loading}>
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
  const [services, setServices] = useState<ServiceCategory[]>([])
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
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    fetchRegisterableServices()
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
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl lg:text-5xl">
              Grow your service business with{' '}
              <span className="text-sky-600">ZepServe</span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-600">
              Join verified professionals on our platform. Receive job leads, send quotes, manage
              bookings, and build your reputation — all in one place.
            </p>
            <ul className="mt-7 space-y-4 text-sm text-zinc-700">
              {[
                'Get matched with customers in your service area',
                'Manage leads, quotes, and schedules from one dashboard',
                'Build trust with verified profiles and customer reviews',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <img
              src={heroImage}
              alt=""
              className="mt-8 w-full max-w-md rounded-2xl object-cover shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_32px_-12px_rgba(0,0,0,0.15)] lg:hidden"
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
                      <option value="">No services available</option>
                    ) : (
                      services.map((service) => (
                        <option key={service.id ?? service.key} value={service.key}>
                          {registerableServiceLabel(service)}
                        </option>
                      ))
                    )}
                  </Select>
                </Field>
                <Field label="Full name" required>
                  <IconInput
                    icon={<UserIcon />}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Your full name"
                  />
                </Field>
                <Field label="Email address" required>
                  <IconInput
                    icon={<MailIcon />}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder="Enter your email address"
                  />
                </Field>
                <Field label="Password" required>
                  <IconInput
                    icon={<LockIcon />}
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    placeholder="Create a password"
                  />
                </Field>
                <Field label="Confirm password" required>
                  <IconInput
                    icon={<LockIcon />}
                    type="password"
                    value={form.confirm_password}
                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                    required
                    placeholder="Confirm your password"
                  />
                </Field>
                <Button
                  type="submit"
                  className="w-full py-3.5 text-base"
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
