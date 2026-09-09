import { useEffect, useState, type FormEvent } from 'react'
import { register } from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { Alert, Button, EyeIcon, Field, IconInput, LockIcon, MailIcon, Modal, UserIcon } from '../ui'

type Props = {
  open: boolean
  onClose: () => void
  onSwitchToLogin: () => void
  onRegistered: (email: string) => void
}

export function RegisterModal({ open, onClose, onSwitchToLogin, onRegistered }: Props) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm_password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({ name: '', email: '', password: '', confirm_password: '' })
    setError('')
  }, [open])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await register({ ...form, role: 'customer' })
      onRegistered(res.data.email)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create your account"
      subtitle="Sign up to book trusted professionals at your doorstep."
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
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
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            placeholder="Create a password"
          />
        </Field>
        <Field label="Confirm password" required>
          <IconInput
            icon={<LockIcon />}
            type={showPassword ? 'text' : 'password'}
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            required
            placeholder="Confirm your password"
          />
        </Field>
        <Button type="submit" className="w-full py-3.5 text-base" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Log in
          </button>
        </p>
      </form>
    </Modal>
  )
}
