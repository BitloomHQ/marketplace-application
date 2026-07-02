import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Alert({ children, variant = 'info' }: { children: ReactNode; variant?: 'info' | 'error' | 'success' }) {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${styles[variant]}`}>
      {children}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  const tones = {
    neutral: 'bg-zinc-100 text-zinc-700',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-800',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function Button({
  className = '',
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' }) {
  const variants = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-md shadow-zinc-900/10',
    secondary: 'bg-white text-zinc-900 hover:bg-zinc-50 border border-zinc-200 shadow-sm',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
    danger: 'bg-rose-600 text-white hover:bg-rose-500',
  }
  return (
    <button
      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

export function Field({
  label,
  children,
  required,
  action,
}: {
  label: string
  children: ReactNode
  required?: boolean
  action?: ReactNode
}) {
  return (
    <div className="block w-full space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-900">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
        {action}
      </div>
      {children}
    </div>
  )
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${className}`}
      {...props}
    />
  )
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-[96px] w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 ${className}`}
      {...props}
    />
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  )
}

export function SectionTitle({
  children,
  subtitle,
}: {
  children: ReactNode
  subtitle?: string
}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-zinc-900 sm:text-xl">{children}</h2>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
    </div>
  )
}

export function EmptyState({ message, icon }: { message: string; icon?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-6 py-14 text-center">
      {icon && <p className="mb-3 text-4xl">{icon}</p>}
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  if (!open) return null

  const maxWidth = wide ? 'sm:max-w-xl' : 'sm:max-w-md'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-zinc-900/55 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 flex max-h-[min(92dvh,100%)] w-full flex-col overflow-visible rounded-t-[1.75rem] border border-zinc-100 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-[1.75rem] ${maxWidth}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -right-2 -top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-rose-500 text-sm font-bold text-white shadow-lg hover:bg-rose-600 sm:-right-3 sm:-top-3"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="shrink-0 px-6 pb-2 pt-8 text-center sm:px-8 sm:pt-10">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{title}</h2>
          {subtitle && (
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">{subtitle}</p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 sm:px-8 pb-tab-bar lg:pb-4">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-zinc-100 px-6 py-4 pb-tab-bar sm:px-8 lg:pb-5">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function ModalActions({
  onCancel,
  submitLabel,
  loading,
  disabled,
  formId,
}: {
  onCancel: () => void
  submitLabel: string
  loading?: boolean
  disabled?: boolean
  formId?: string
}) {
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="secondary"
        onClick={onCancel}
        disabled={loading}
        className="w-full !rounded-full border-zinc-300 py-3 font-semibold sm:w-auto sm:min-w-[9rem]"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        disabled={disabled || loading}
        className="w-full !rounded-full !bg-sky-600 py-3 font-bold shadow-md shadow-sky-600/20 hover:!bg-sky-700 sm:w-auto sm:min-w-[11rem]"
      >
        {loading ? 'Please wait…' : submitLabel}
      </Button>
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500">
      <span>
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  )
}
