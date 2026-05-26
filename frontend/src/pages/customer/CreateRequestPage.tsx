import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createServiceRequest } from '../../api/services'
import { ApiRequestError } from '../../api/client'
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from '../../components/ui'
import { SERVICE_OPTIONS } from '../../lib/format'
import { addStoredRequestId } from '../../lib/storage'
import type { ServiceType } from '../../types'

export function CreateRequestPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const preset = (location.state as { serviceType?: ServiceType } | null)?.serviceType
  const [serviceType, setServiceType] = useState<ServiceType>(preset ?? 'plumber')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await createServiceRequest({
        service_type: serviceType,
        address,
        description: description || undefined,
      })
      addStoredRequestId(res.request_id)
      navigate(`/customer/quotes/${res.request_id}`, {
        state: { created: true, requestId: res.request_id },
      })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="New service request" subtitle="Providers matching your service type will be notified" />
      <Card className="max-w-xl">
        {error && (
          <div className="mb-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Service type">
            <Select value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
              {SERVICE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Address">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Noida Sector 62" />
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kitchen pipe leakage"
            />
          </Field>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit request'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate('/customer-dashboard')}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
