import { useEffect, useId, useState, type FormEvent } from 'react'
import { sendQuote } from '../api/services'
import { ApiRequestError } from '../api/client'
import type { Lead } from '../types'
import { Alert, Field, Input, Modal, ModalActions, Textarea } from './ui'

type Props = {
  lead: Lead | null
  open: boolean
  onClose: () => void
  onSent: () => void
}

export function SendQuoteModal({ lead, open, onClose, onSent }: Props) {
  const formId = useId().replace(/:/g, '')
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
    <Modal
      open={open}
      onClose={handleClose}
      title="Send your quote"
      subtitle="Share your price, details, and connect with customers faster."
      wide
      footer={
        <ModalActions
          formId={formId}
          onCancel={handleClose}
          submitLabel="Submit quote"
          loading={loading}
          disabled={!lead}
        />
      }
    >
      {lead && (
        <p className="mb-5 text-center text-sm font-medium text-zinc-600">
          Job #{lead.id} · {lead.address}
        </p>
      )}
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form id={formId} onSubmit={handleSubmit} className="space-y-5">
        <Field label="Price (₹)">
          <div className="relative w-full">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-zinc-400">
              ₹
            </span>
            <Input
              type="number"
              min={1}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              placeholder="500"
              className="!rounded-xl !pl-10 text-lg font-semibold"
              disabled={loading}
            />
          </div>
        </Field>
        <Field label="Message to customer">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. I can visit today afternoon"
            rows={4}
            className="!min-h-[100px] !rounded-xl resize-y"
            disabled={loading}
          />
        </Field>
      </form>
    </Modal>
  )
}
