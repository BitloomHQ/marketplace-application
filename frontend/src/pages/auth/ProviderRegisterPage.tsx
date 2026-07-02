import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchActiveServices, register } from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { AuthPortalLinks } from '../../components/AuthPortalLinks'
import { Alert, Button, Card, Field, Input, PageHeader, Select } from '../../components/ui'
import type { ActiveService } from '../../types'

export function ProviderRegisterPage() {
  const navigate = useNavigate()
  const [services, setServices] = useState<ActiveService[]>([])
  const [serviceType, setServiceType] = useState('')
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingServices, setLoadingServices] = useState(true)

  useEffect(() => {
    fetchActiveServices()
      .then((res) => {
        setServices(res.services)
        if (res.services[0]) setServiceType(res.services[0].key)
      })
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false))
  }, [])

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
        subtitle="Join as a verified home service professional"
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
            onChange={(e) => setServiceType(e.target.value)}
            disabled={loadingServices || services.length === 0}
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
        <Button
          type="submit"
          className="w-full"
          disabled={loading || loadingServices || services.length === 0}
        >
          {loading ? 'Creating…' : 'Create provider account'}
        </Button>
      </form>
      <AuthPortalLinks portal="provider" />
    </Card>
  )
}
