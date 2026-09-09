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
    primary:
      'bg-sky-600 text-white shadow-[0_1px_2px_rgba(3,105,161,0.2),0_8px_16px_-6px_rgba(2,132,199,0.45)] hover:bg-sky-700 hover:shadow-[0_1px_2px_rgba(3,105,161,0.25),0_10px_20px_-6px_rgba(2,132,199,0.5)] active:scale-[0.98]',
    secondary:
      'bg-white text-zinc-900 hover:bg-zinc-50 border border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:scale-[0.98]',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
    danger:
      'bg-rose-600 text-white shadow-[0_1px_2px_rgba(159,18,57,0.2),0_8px_16px_-6px_rgba(225,29,72,0.4)] hover:bg-rose-500 active:scale-[0.98]',
  }
  return (
    <button
      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  /** Adds a hover lift for cards that act as links/buttons. */
  interactive?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_1px_1px_rgba(0,0,0,0.02)] transition-all duration-150 ${
        interactive ? 'hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_24px_-12px_rgba(0,0,0,0.12)]' : ''
      } ${className}`}
    >
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

export function MailIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
}

export function LockIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v2h8z" />
    </svg>
  )
}

export function UserIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

export function EyeIcon({ off }: { off: boolean }) {
  if (off) {
    return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.584 10.587a2 2 0 002.828 2.83M9.363 5.365A9.466 9.466 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.973 9.973 0 01-1.622 3.128M6.61 6.61A9.968 9.968 0 002.458 12c1.274 4.057 5.065 7 9.542 7a9.964 9.964 0 004.293-.966" />
      </svg>
    )
  }
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export function IconInput({
  icon,
  trailing,
  wrapperClassName = '',
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon: ReactNode
  trailing?: ReactNode
  wrapperClassName?: string
}) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-zinc-400">
        {icon}
      </span>
      <input
        className={`w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-11 ${
          trailing ? 'pr-11' : 'pr-4'
        } text-zinc-900 placeholder:text-zinc-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${className}`}
        {...props}
      />
      {trailing && <span className="absolute inset-y-0 right-3 flex items-center">{trailing}</span>}
    </div>
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

export function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-emerald-500' : 'bg-zinc-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export function PageHeader({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      {title && <h1 className="text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>}
      {subtitle && <p className={`text-sm text-zinc-500 ${title ? 'mt-1' : ''}`}>{subtitle}</p>}
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
        className={`relative z-10 flex max-h-[min(92dvh,100%)] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-zinc-100 bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-[1.75rem] ${maxWidth}`}
      >
        <div className="shrink-0 px-6 pb-2 pt-6 text-center sm:px-8 sm:pt-8">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{title}</h2>
          {subtitle && (
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-500">{subtitle}</p>
          )}
        </div>

        <div className="max-h-[calc(92dvh-12rem)] overflow-y-auto overscroll-contain px-6 py-4 sm:max-h-[calc(90vh-12rem)] sm:px-8">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-zinc-100 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
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
    <div className="flex flex-row gap-3 sm:justify-end">
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
