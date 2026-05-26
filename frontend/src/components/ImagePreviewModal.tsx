type Props = {
  src: string | null
  alt?: string
  open: boolean
  onClose: () => void
}

export function ImagePreviewModal({ src, alt = 'Preview', open, onClose }: Props) {
  if (!open || !src) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pb-tab-bar sm:pb-4">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/85 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close preview"
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 rounded-full bg-white/90 p-2 text-zinc-700 shadow-md hover:bg-white"
        aria-label="Close"
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        className="relative z-10 max-h-[min(85dvh,calc(100dvh-6rem))] w-auto max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
