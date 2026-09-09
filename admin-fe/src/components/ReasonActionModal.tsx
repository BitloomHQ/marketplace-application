import { useEffect, useId, useState, type FormEvent } from 'react'
import { Alert, Field, Modal, ModalActions, Textarea } from './ui'

type Props = {
  open: boolean
  title: string
  subtitle?: string
  confirmLabel?: string
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export function ReasonActionModal({
  open,
  title,
  subtitle,
  confirmLabel = 'Confirm',
  onClose,
  onConfirm,
}: Props) {
  const formId = useId().replace(/:/g, '')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setReason('')
    setError('')
  }, [open])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Please enter a reason.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      subtitle={subtitle}
      footer={
        <ModalActions
          formId={formId}
          onCancel={handleClose}
          submitLabel={loading ? '…' : confirmLabel}
          loading={loading}
          disabled={!reason.trim()}
        />
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form id={formId} onSubmit={handleSubmit}>
        <Field label="Reason" required>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you are taking this action…"
            rows={4}
            required
            disabled={loading}
            className="!min-h-[100px]"
          />
        </Field>
      </form>
    </Modal>
  )
}
