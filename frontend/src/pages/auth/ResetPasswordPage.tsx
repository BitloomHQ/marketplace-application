import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { Alert, Button, Card, Field, Input, PageHeader } from '../../components/ui'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const [uid] = useState(searchParams.get('uid') ?? '')
  const [token] = useState(searchParams.get('token') ?? '')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await resetPassword({
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      setSuccess(res.message)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const data = err.data as {
          confirm_password?: string[]
          new_password?: string[]
          uid?: string[]
          message?: string
        }
        const messages = [
          ...(data.confirm_password ?? []),
          ...(data.new_password ?? []),
          ...(data.uid ?? []),
        ]
        setError(messages.join(' ') || err.message)
      } else setError('Reset failed')
    } finally {
      setLoading(false)
    }
  }

  if (!uid || !token) {
    return (
      <Card className="max-w-md">
        <PageHeader title="Invalid reset link" subtitle="Use the link from your email" />
        <Link to="/forgot-password" className="text-sm font-semibold text-sky-600 hover:text-sky-700">
          Request a new reset link
        </Link>
      </Card>
    )
  }

  return (
    <Card className="max-w-md">
      <PageHeader title="Reset password" subtitle="Choose a new password for your account" />
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
        <Field label="New password">
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="Confirm password">
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Saving…' : 'Reset password'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-600">
        <Link to="/customer/login" className="font-semibold text-sky-600 hover:text-sky-700">
          Back to sign in
        </Link>
      </p>
    </Card>
  )
}
