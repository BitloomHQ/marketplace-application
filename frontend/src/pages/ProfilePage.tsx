import { useEffect, useState, type FormEvent } from 'react'
import { fetchProfile, updateProfile } from '../api/services'
import { ApiRequestError } from '../api/client'
import { Alert, Button, Card, Field, Input, PageHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setError('')
    fetchProfile()
      .then((res) => {
        setUsername(res.user.username)
        setEmail(res.user.email)
        setPhone(res.user.phone ?? '')
        setAddress(res.user.address ?? '')
        setUser(res.user)
      })
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load profile'),
      )
      .finally(() => setLoading(false))
  }, [setUser])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const res = await updateProfile({ username, email, phone, address })
      setUser(res.user)
      setSuccess(res.message)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Account"
        subtitle={user ? 'Your details & contact info' : 'Manage your account'}
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
      <Card className="max-w-xl">
        {loading ? (
          <p className="text-slate-400">Loading profile…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Username">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Address">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
