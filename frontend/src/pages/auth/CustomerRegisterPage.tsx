import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { AuthPortalLinks } from '../../components/AuthPortalLinks'
import { Alert, Button, Card, Field, Input, PageHeader } from '../../components/ui'

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
    <Card>
      <PageHeader title="Customer registration" subtitle="Create an account to book home services" />
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create customer account'}
        </Button>
      </form>
      <AuthPortalLinks portal="customer" />
    </Card>
  )
}
