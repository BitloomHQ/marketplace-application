import { useState, type FormEvent } from 'react'
import { submitReview } from '../api/services'
import { ApiRequestError } from '../api/client'
import type { Booking } from '../types'
import { Alert, Button, Field, Input, Modal, Textarea } from './ui'

type Props = {
  booking: Booking | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ReviewModal({ booking, open, onClose, onSuccess }: Props) {
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!booking) return

    if (booking.has_review) {
      setError('You already reviewed this booking.')
      return
    }

    if (booking.status !== 'completed') {
      setError('You can review only completed bookings.')
      return
    }

    const providerId = booking.provider_id
    if (!providerId) {
      setError('Could not resolve provider for this booking.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await submitReview({
        booking_id: booking.id,
        provider_id: providerId,
        rating,
        review: review || undefined,
      })
      setRating(5)
      setReview('')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Review failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add a review">
      {booking && (
        <p className="mb-4 text-sm text-slate-400">
          Rate your experience with <span className="text-slate-200">{booking.provider}</span>
        </p>
      )}
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Rating (1–5)">
          <Input
            type="number"
            min={1}
            max={5}
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            required
          />
        </Field>
        <Field label="Review">
          <Textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share your experience…"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !booking}>
            {loading ? 'Submitting…' : 'Submit review'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
