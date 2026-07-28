import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { resendEmailOtp, verifyEmail } from '../../api/accounts'
import { ApiRequestError } from '../../api/client'
import { AuthPortalLinks } from '../../components/AuthPortalLinks'
import { Alert, Button, Card, Field, Input, PageHeader } from '../../components/ui'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { email?: string; portal?: 'customer' | 'provider' } | null
  const [email, setEmail] = useState(state?.email ?? '')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [retryAfter, setRetryAfter] = useState(0)

  const portal = state?.portal ?? 'customer'
  const loginPath = portal === 'provider' ? '/provider/login' : '/customer/login'

  useEffect(() => {
    if (retryAfter <= 0) return
    const timer = window.setInterval(() => {
      setRetryAfter((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [retryAfter])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const res = await verifyEmail(email, otp)
      setSuccess(res.message)
      setTimeout(() => navigate(loginPath), 1500)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const data = err.data as { otp?: string[]; message?: string }
        if (data?.otp?.length) setError(data.otp.join(' '))
        else setError(err.message)
      } else setError('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setResendLoading(true)
    try {
      const res = await resendEmailOtp(email)
      setSuccess(res.message)
      setRetryAfter(60)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const data = err.data as { retry_after_seconds?: number }
        if (data.retry_after_seconds) setRetryAfter(data.retry_after_seconds)
        setError(err.message)
      } else setError('Unable to resend OTP')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <Card>
      <PageHeader
        title="Verify your email"
        subtitle="Enter the 6-digit code sent to your inbox"
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
        <Field label="Verification code">
          <Input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            placeholder="123456"
          />
        </Field>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify email'}
        </Button>
      </form>
      <div className="mt-4 flex flex-col gap-2 text-sm">
        <Button
          type="button"
          className="w-full"
          disabled={resendLoading || retryAfter > 0}
          onClick={handleResend}
        >
          {retryAfter > 0
            ? `Resend OTP in ${retryAfter}s`
            : resendLoading
              ? 'Sending…'
              : 'Resend OTP'}
        </Button>
        <Link to={loginPath} className="text-center text-sky-600 hover:text-sky-700">
          Back to sign in
        </Link>
      </div>
      <AuthPortalLinks portal={portal} />
    </Card>
  )
}
