import { useEffect, useState, type FormEvent } from 'react'
import { submitReview } from '../api/services'
import { ApiRequestError } from '../api/client'
import type { Booking } from '../types'
import { Alert, Button, Field, Modal, Textarea } from './ui'
import { StarRating } from './StarRating'

type Props = {
  booking: Booking | null
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ReviewModal({ booking, open, onClose, onSuccess }: Props) {
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setRating(0)
    setReview('')
    setError('')
  }, [open, booking?.id])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!booking) return

    if (rating < 1 || rating > 5) {
      setError('Please select a star rating.')
      return
    }

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
        <p className="mb-4 text-sm text-zinc-500">
          Rate your experience with <span className="font-semibold text-zinc-800">{booking.provider}</span>
        </p>
      )}
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Your rating">
          <StarRating value={rating} onChange={setRating} disabled={loading} />
        </Field>
        <Field label="Review (optional)">
          <Textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Share your experience…"
            disabled={loading}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !booking || rating < 1}>
            {loading ? 'Submitting…' : 'Submit review'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
