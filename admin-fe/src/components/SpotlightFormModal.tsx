import { useEffect, useId, useState, type FormEvent } from 'react'
import { createAdminSpotlight, updateAdminSpotlight, type AdminSpotlight } from '../api/admin'
import { ApiRequestError } from '../api/client'
import { resolveMediaUrl } from '../lib/media'
import { Alert, Field, Input, Modal, ModalActions, Switch, Textarea } from './ui'

type Props = {
  spotlight: AdminSpotlight | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function SpotlightFormModal({ spotlight, open, onClose, onSaved }: Props) {
  const formId = useId().replace(/:/g, '')
  const isEdit = spotlight != null
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setTitle(spotlight?.title ?? '')
    setSubtitle(spotlight?.subtitle ?? '')
    setRedirectUrl(spotlight?.redirect_url ?? '')
    setIsActive(spotlight?.is_active ?? true)
    setImage(null)
    setPreview(resolveMediaUrl(spotlight?.image_url ?? spotlight?.image ?? null))
    setError('')
  }, [open, spotlight])

  const handleClose = () => {
    if (!loading) onClose()
  }

  const handleImageChange = (file: File | null) => {
    setImage(file)
    setPreview(file ? URL.createObjectURL(file) : resolveMediaUrl(spotlight?.image_url ?? spotlight?.image ?? null))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!isEdit && !image) {
      setError('Please choose an image.')
      return
    }
    setError('')
    setLoading(true)
    try {
      if (isEdit) {
        await updateAdminSpotlight(spotlight.id, {
          title,
          subtitle,
          redirect_url: redirectUrl,
          is_active: isActive,
          image,
        })
      } else {
        await createAdminSpotlight({
          title,
          subtitle,
          redirect_url: redirectUrl,
          is_active: isActive,
          image: image!,
        })
      }
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Edit spotlight' : 'Create spotlight'}
      subtitle="Featured banner shown in the customer app's 'In the spotlight' section."
      wide
      footer={
        <ModalActions
          formId={formId}
          onCancel={handleClose}
          submitLabel={isEdit ? 'Save changes' : 'Create spotlight'}
          loading={loading}
        />
      }
    >
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <form id={formId} onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required disabled={loading} />
        </Field>
        <Field label="Redirect URL">
          <Input
            type="url"
            value={redirectUrl}
            onChange={(e) => setRedirectUrl(e.target.value)}
            placeholder="https://…"
            disabled={loading}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Subtitle">
            <Textarea
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              disabled={loading}
              className="!min-h-[70px]"
            />
          </Field>
        </div>

        <Field label={isEdit ? 'Replace image' : 'Image'} required={!isEdit}>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
            disabled={loading}
          />
        </Field>

        {preview && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-zinc-900">Preview</p>
            <img
              src={preview}
              alt=""
              className="h-24 w-full rounded-xl border border-zinc-200 object-cover"
            />
          </div>
        )}

        <div className="sm:col-span-2 flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Active</p>
            <p className="text-xs text-zinc-500">Inactive spotlights are hidden from the customer app.</p>
          </div>
          <Switch checked={isActive} onChange={setIsActive} disabled={loading} />
        </div>
      </form>
    </Modal>
  )
}
