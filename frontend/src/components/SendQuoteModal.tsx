import { useEffect, useState, type FormEvent } from 'react'
import { sendQuote } from '../api/services'
import { ApiRequestError } from '../api/client'
import type { Lead } from '../types'
import { Alert, Button, Field, Input, Modal, Textarea } from './ui'

type Props = {
  lead: Lead | null
  open: boolean
  onClose: () => void
  onSent: () => void
}

export function SendQuoteModal({ lead, open, onClose, onSent }: Props) {
  const [price, setPrice] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setPrice('')
    setMessage('')
    setError('')
  }, [open, lead?.id])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!lead) return
    setError('')
    setLoading(true)
    try {
      await sendQuote({
        service_request_id: lead.id,
        price: Number(price),
        message: message || undefined,
      })
      onSent()
      onClose()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to send quote')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Send your quote" wide>
      {lead && (
        <p className="mb-4 text-sm text-zinc-500">
          Job #{lead.id} · {lead.address}
        </p>
      )}
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Price (₹)">
          <Input
            type="number"
            min={1}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            placeholder="500"
            className="max-w-[200px] text-lg font-semibold"
            disabled={loading}
          />
        </Field>
        <Field label="Message to customer">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="I can visit today afternoon…"
            rows={3}
            className="!min-h-[72px] resize-y"
            disabled={loading}
          />
        </Field>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" disabled={loading} onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !lead}>
            {loading ? 'Sending…' : 'Submit quote'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
