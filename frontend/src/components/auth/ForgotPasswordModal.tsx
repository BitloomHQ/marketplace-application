import { useEffect, useState, type FormEvent } from 'react'
import { forgotPassword } from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { Alert, Button, Field, IconInput, MailIcon, Modal } from '../ui'

type Props = {
  open: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

export function ForgotPasswordModal({ open, onClose, onSwitchToLogin }: Props) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setError('')
    setSuccess('')
  }, [open])

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
        setError(data?.email?.length ? data.email.join(' ') : err.message)
      } else setError('Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Forgot password"
      subtitle="We'll email you reset instructions."
    >
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
        <Field label="Email address" required>
          <IconInput
            icon={<MailIcon />}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Enter your email address"
          />
        </Field>
        <Button type="submit" className="w-full py-3.5 text-base" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </Button>

        <p className="text-center text-sm text-zinc-500">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="font-semibold text-sky-600 hover:text-sky-700"
          >
            Back to sign in
          </button>
        </p>
      </form>
    </Modal>
  )
}
