import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { AuthRegisterShell } from '../../components/auth/AuthRegisterShell'
import { Alert, Button, Field, Input } from '../../components/ui'

export function CustomerRegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await register({ ...form, role: 'customer' })
      navigate('/verify-email', {
        state: { email: res.data.email, portal: 'customer' },
      })
    } catch (err) {
      if (err instanceof ApiRequestError) setError(err.message)
      else setError('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthRegisterShell
      title="Create your account"
      subtitle="Sign up to book trusted home services at your doorstep."
      footer={
        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/?login=1" className="font-semibold text-sky-600 hover:text-sky-700">
            Log in
          </Link>
        </p>
      }
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
          className="w-full !rounded-full !bg-sky-600 py-3.5 text-base font-bold hover:!bg-sky-700"
          disabled={loading}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthRegisterShell>
  )
}
