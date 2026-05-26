import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { AuthPortalLinks } from '../../components/AuthPortalLinks'
import { Alert, Button, Card, Field, Input, PageHeader } from '../../components/ui'

export function CustomerRegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await register({ ...form, role: 'customer' })
      setSuccess(res.message)
      setTimeout(() => navigate('/customer/login'), 1500)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const data = err.data as { errors?: Record<string, string[]> }
        if (data?.errors) {
          setError(
            Object.entries(data.errors)
              .map(([k, v]) => `${k}: ${v.join(', ')}`)
              .join('; '),
          )
        } else setError(err.message)
      } else setError('Registration failed')
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
      {success && (
        <div className="mb-4">
          <Alert variant="success">{success}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Username">
          <Input
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
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
        <Field label="Phone">
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </Field>
        <Field label="Address">
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Your home address"
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
