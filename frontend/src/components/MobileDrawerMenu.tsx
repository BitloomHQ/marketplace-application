import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function HamburgerButton({
  open,
  onClick,
  label = 'Open menu',
}: {
  open: boolean
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-700 transition hover:bg-zinc-100"
      aria-label={label}
      aria-expanded={open}
    >
      <span className="relative block h-4 w-5">
        <span
          className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition ${
            open ? 'top-[7px] rotate-45' : 'top-0'
          }`}
        />
        <span
          className={`absolute left-0 top-[7px] block h-0.5 w-5 rounded-full bg-current transition ${
            open ? 'opacity-0' : 'opacity-100'
          }`}
        />
        <span
          className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition ${
            open ? 'top-[7px] -rotate-45' : 'top-[14px]'
          }`}
        />
      </span>
    </button>
  )
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

type MobileDrawerMenuProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function MobileDrawerMenu({ open, onClose, title, children }: MobileDrawerMenuProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[100] bg-black/40 lg:hidden"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div
        className="fixed inset-y-0 right-0 z-[110] flex w-[min(100vw-2.5rem,20rem)] flex-col bg-white shadow-2xl lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? 'Menu'}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          {title ? (
            <p className="text-sm font-semibold text-zinc-900">{title}</p>
          ) : (
            <span className="text-sm font-semibold text-zinc-900">Menu</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">{children}</div>
      </div>
    </>,
    document.body,
  )
}
