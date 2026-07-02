import { useEffect, useRef, useState } from 'react'

const MAX_BYTES = 10 * 1024 * 1024

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = {
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
}

export function FileUploadZone({ file, onChange, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const uploadedRef = useRef<HTMLDivElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')

  const pickFile = (next: File | null) => {
    setError('')
    if (!next) {
      onChange(null)
      return
    }
    if (!next.type.startsWith('image/')) {
      setError('Only JPEG and PNG images are supported.')
      return
    }
    if (next.size > MAX_BYTES) {
      setError('File must be 10 MB or smaller.')
      return
    }
    onChange(next)
  }

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!file || !previewUrl) return
    const frame = requestAnimationFrame(() => {
      uploadedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
    return () => cancelAnimationFrame(frame)
  }, [file, previewUrl])

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          if (disabled) return
          pickFile(e.dataTransfer.files?.[0] ?? null)
        }}
        className={`rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
          dragOver ? 'border-sky-400 bg-sky-50/50' : 'border-zinc-200 bg-zinc-50/50'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-sky-600 shadow-sm">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-zinc-800">Choose a file or drag & drop it here</p>
        <p className="mt-1 text-xs text-zinc-500">JPEG, PNG formats up to 10 MB</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-full border border-zinc-300 bg-white px-5 py-2 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50"
        >
          Browse file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={disabled}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}

      {file && previewUrl && (
        <div
          ref={uploadedRef}
          className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3"
        >
          <img src={previewUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-900">{file.name}</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {formatSize(file.size)} ·{' '}
              <span className="font-medium text-emerald-600">Completed ✓</span>
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50"
            aria-label="Remove file"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
