import { useEffect, useState, type FormEvent } from 'react'
import { register } from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { Alert, Button, Field, Input, Modal } from '../ui'

type Props = {
  open: boolean
  onClose: () => void
  onSwitchToLogin: () => void
  onRegistered: (email: string) => void
}

export function RegisterModal({ open, onClose, onSwitchToLogin, onRegistered }: Props) {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm_password: '' })
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
          className="w-full !rounded-full !bg-sky-600 py-3.5 text-base font-bold shadow-md shadow-sky-600/25 hover:!bg-sky-700"
          disabled={loading}
        >
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
