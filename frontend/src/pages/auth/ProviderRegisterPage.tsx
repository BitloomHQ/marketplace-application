import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { AuthPortalLinks } from '../../components/AuthPortalLinks'
import { Alert, Button, Card, Field, Input, PageHeader, Select } from '../../components/ui'
import { SERVICE_OPTIONS } from '../../lib/format'
import type { ServiceType } from '../../types'

export function ProviderRegisterPage() {
  const navigate = useNavigate()
  const [serviceType, setServiceType] = useState<ServiceType>('plumber')
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
      const res = await register({ ...form, role: serviceType })
      setSuccess(res.message)
      setTimeout(() => navigate('/provider/login'), 1500)
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
      <PageHeader
        title="Provider registration"
        subtitle="Join as a plumber, electrician, or gardener"
      />
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
        <Field label="Service type">
          <Select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceType)}
          >
            {SERVICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
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
        <Field label="Business / service address">
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Where you operate from"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create provider account'}
        </Button>
      </form>
      <AuthPortalLinks portal="provider" />
    </Card>
  )
}
