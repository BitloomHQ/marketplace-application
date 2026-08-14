import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { Alert, Button, Card, Field, Input, PageHeader } from '../../components/ui'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await forgotPassword(email)
      setSuccess(res.message)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const data = err.data as { email?: string[] }
        if (data?.email?.length) setError(data.email.join(' '))
        else setError(err.message)
      } else setError('Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-md">
      <PageHeader
        title="Forgot password"
        subtitle="We will email you reset instructions"
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
        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600">
        <Link to="/?login=1" className="font-semibold text-sky-600 hover:text-sky-700">
          Back to sign in
        </Link>
      </p>
    </Card>
  )
}
