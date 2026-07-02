import type { ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { useServiceImageMap } from '../hooks/useServiceImageMap'
import { formatService, formatStatus } from '../lib/format'

export type ListStatusTone = 'assigned' | 'pending' | 'cancelled' | 'in_progress' | 'completed' | 'neutral'

export function listStatusTone(status: string): ListStatusTone {
  if (status === 'assigned') return 'assigned'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'completed') return 'completed'
  if (status === 'in_progress') return 'in_progress'
  if (status === 'pending' || status === 'quotation_received') return 'pending'
  return 'neutral'
}

const statusStyles: Record<ListStatusTone, string> = {
  assigned: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-rose-100 text-rose-700',
  in_progress: 'bg-sky-100 text-sky-700',
  completed: 'bg-emerald-100 text-emerald-700',
  neutral: 'bg-zinc-100 text-zinc-700',
}

function ServiceThumbnail({ serviceType }: { serviceType: string }) {
  const { resolveServiceImage } = useServiceImageMap()

  return (
    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-zinc-200 ring-1 ring-zinc-100">
      <img
        src={resolveServiceImage(serviceType)}
        alt={formatService(serviceType)}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  )
}

function DetailRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-zinc-600">
      <span className="mt-0.5 shrink-0 text-zinc-400">{icon}</span>
      <span className="min-w-0 leading-relaxed">{children}</span>
    </div>
  )
}

function StarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function LocationIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

function ActionIcon({ type }: { type: 'calendar' | 'cancel' }) {
  if (type === 'cancel') {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

const actionStyles = {
  primary: 'bg-zinc-900 text-white hover:bg-zinc-800',
  danger: 'bg-rose-500 text-white hover:bg-rose-600',
  secondary: 'bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50',
}

export function ListCardButton({
  children,
  variant = 'primary',
  icon,
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'danger' | 'secondary'
  icon?: 'calendar' | 'cancel'
}) {
  return (
    <button
      type="button"
      className={`inline-flex min-w-[9.5rem] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${actionStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <ActionIcon type={icon} />}
      {children}
    </button>
  )
}

export function ListCardLink({
  children,
  variant = 'primary',
  icon,
  className = '',
  ...props
}: LinkProps & {
  variant?: 'primary' | 'danger' | 'secondary'
  icon?: 'calendar' | 'cancel'
}) {
  return (
    <Link
      className={`inline-flex min-w-[9.5rem] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${actionStyles[variant]} ${className}`}
      {...props}
    >
      {icon && <ActionIcon type={icon} />}
      {children}
    </Link>
  )
}

export function ServiceListCard({
  serviceType,
  title,
  status,
  rating,
  date,
  location,
  locationHref,
  description,
  extra,
  actions,
  onClick,
}: {
  serviceType: string
  title?: string
  status: string
  rating?: ReactNode
  date?: string | null
  location?: string | null
  locationHref?: string | null
  description?: string | null
  extra?: ReactNode
  actions?: ReactNode
  onClick?: () => void
}) {
  const tone = listStatusTone(status)
  const displayTitle = title ?? `${formatService(serviceType)} Service`

  return (
    <article
      onClick={onClick}
      className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 ${
        onClick ? 'cursor-pointer transition hover:border-sky-200 hover:shadow-md' : ''
      }`}
    >
      <div className="flex gap-4">
        <ServiceThumbnail serviceType={serviceType} />

        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-zinc-900 sm:text-lg">{displayTitle}</h3>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyles[tone]}`}
              >
                {formatStatus(status)}
              </span>
            </div>

            <div className="space-y-2">
              {rating && (
                <DetailRow icon={<StarIcon />}>{rating}</DetailRow>
              )}
              {date && (
                <DetailRow icon={<CalendarIcon />}>{date}</DetailRow>
              )}
              {location && (
                <DetailRow icon={<LocationIcon />}>
                  {locationHref ? (
                    <a
                      href={locationHref}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-sky-600 underline-offset-2 hover:underline"
                    >
                      {location}
                    </a>
                  ) : (
                    location
                  )}
                </DetailRow>
              )}
              {description && (
                <DetailRow icon={<ChatIcon />}>
                  <span className="line-clamp-2">{description}</span>
                </DetailRow>
              )}
            </div>

            {extra && <div className="pt-1">{extra}</div>}
          </div>

          {actions && (
            <div
              className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end"
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export function formatRatingLine(average: number, total: number): string {
  if (!total) return 'No ratings yet'
  return `${average}/5 (${total.toLocaleString()} Rating${total !== 1 ? 's' : ''})`
}

export function formatListDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
