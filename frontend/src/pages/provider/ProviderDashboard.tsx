import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboard } from '../../api/accounts'
import { Alert, Button, Card, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { formatService } from '../../lib/format'

export function ProviderDashboard() {
  const { user } = useAuth()
  const [features, setFeatures] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboard()
      .then((res) => setFeatures(res.data.features ?? []))
      .catch(() => setError('Could not load dashboard'))
  }, [])

  return (
    <div>
      <PageHeader
        title={`${formatService(user?.role ?? '')} dashboard`}
        subtitle={`Welcome, ${user?.username}`}
      />
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-white">Open leads</h2>
          <p className="mt-2 text-sm text-slate-400">View customer requests for your service type and send quotes.</p>
          <Link to="/provider/leads" className="mt-4 inline-block">
            <Button>View leads</Button>
          </Link>
        </Card>
        <Card>
          <h2 className="font-semibold text-white">My bookings</h2>
          <p className="mt-2 text-sm text-slate-400">Update job status: assigned → in progress → completed.</p>
          <Link to="/provider/bookings" className="mt-4 inline-block">
            <Button variant="secondary">Manage bookings</Button>
          </Link>
        </Card>
      </div>
      {features.length > 0 && (
        <Card className="mt-6">
          <h2 className="font-semibold text-white">What you can do</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-400">
            {features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
