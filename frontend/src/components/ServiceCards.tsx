import { formatService } from '../lib/format'
import { SERVICE_META } from '../lib/serviceMeta'
import { SERVICE_IMAGES } from '../lib/serviceImages'
import type { ServiceType } from '../types'

const DEFAULT_SERVICES: ServiceType[] = ['plumber', 'electrician', 'gardener']

type ServiceCardsLayout = 'grid' | 'scroll'
type ServiceCardsVariant = 'card' | 'circle'

type ServiceCardProps = {
  service: ServiceType
  layout: ServiceCardsLayout
  variant: ServiceCardsVariant
  showCta?: boolean
  titleCentered?: boolean
  onClick: () => void
}

function ServiceCard({
  service,
  layout,
  variant,
  showCta = false,
  titleCentered = false,
  onClick,
}: ServiceCardProps) {
  const meta = SERVICE_META[service]
  const align = titleCentered ? 'text-center' : 'text-left'

  if (variant === 'circle') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="group flex w-full flex-col items-center text-center transition active:scale-[0.97]"
      >
        <div className="relative h-[5.5rem] w-[5.5rem] overflow-hidden rounded-full bg-sky-100 ring-[3px] ring-sky-100 shadow-md transition group-hover:ring-sky-300 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36">
          <img
            src={SERVICE_IMAGES[service]}
            alt={formatService(service)}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
        <p className="mt-3 text-sm font-bold sm:text-base">
          {formatService(service)}
        </p>
        <p className="mt-1 line-clamp-2 px-1 text-xs leading-snug text-zinc-500 sm:text-sm">
          {meta.tagline}
        </p>
        {showCta && (
          <p className="mt-2 text-xs font-semibold text-sky-600 sm:text-sm">Book now</p>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col overflow-hidden bg-transparent transition active:scale-[0.98] ${
        layout === 'scroll'
          ? 'w-[min(72vw,11rem)] shrink-0 snap-start sm:w-auto'
          : 'w-full'
      } ${align}`}
    >
      <img
        src={SERVICE_IMAGES[service]}
        alt={formatService(service)}
        className="aspect-[4/3] w-full rounded-2xl object-cover"
        loading="lazy"
      />
      <div className={`flex flex-1 flex-col p-2 sm:p-3 ${align}`}>
        <p
          className={`text-xs font-bold sm:text-sm ${
            titleCentered ? meta.color : 'text-zinc-900'
          }`}
        >
          {formatService(service)}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-zinc-500 sm:text-xs">
          {meta.tagline}
        </p>
        {showCta && (
          <p className="mt-2 text-xs font-semibold text-sky-600">Book now →</p>
        )}
      </div>
    </button>
  )
}

type ServiceCardsProps = {
  onSelect: (service: ServiceType) => void
  services?: ServiceType[]
  layout?: ServiceCardsLayout
  variant?: ServiceCardsVariant
  showCta?: boolean
  titleCentered?: boolean
  className?: string
}

export function ServiceCards({
  onSelect,
  services = DEFAULT_SERVICES,
  layout = 'grid',
  variant = 'card',
  showCta = false,
  titleCentered = false,
  className = '',
}: ServiceCardsProps) {
  const containerClass =
    variant === 'circle'
      ? 'grid grid-cols-3 gap-4 sm:gap-8 md:gap-10'
      : layout === 'grid'
        ? 'grid grid-cols-3 gap-2 sm:gap-3'
        : 'scrollbar-none flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0'

  return (
    <div className={`${containerClass} ${className}`.trim()}>
      {services.map((service) => (
        <ServiceCard
          key={service}
          service={service}
          layout={layout}
          variant={variant}
          showCta={showCta}
          titleCentered={titleCentered}
          onClick={() => onSelect(service)}
        />
      ))}
    </div>
  )
}
