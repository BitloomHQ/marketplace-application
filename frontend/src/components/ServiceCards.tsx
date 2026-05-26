import { formatService } from '../lib/format'
import { SERVICE_META } from '../lib/serviceMeta'
import { SERVICE_IMAGES } from '../lib/serviceImages'
import type { ServiceType } from '../types'

const DEFAULT_SERVICES: ServiceType[] = ['plumber', 'electrician', 'gardener']

type ServiceCardsLayout = 'grid' | 'scroll'

type ServiceCardProps = {
  service: ServiceType
  layout: ServiceCardsLayout
  showCta?: boolean
  titleCentered?: boolean
  onClick: () => void
}

function ServiceCard({
  service,
  layout,
  showCta = false,
  titleCentered = false,
  onClick,
}: ServiceCardProps) {
  const meta = SERVICE_META[service]
  const align = titleCentered ? 'text-center' : 'text-left'

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
        className="aspect-[4/3] w-full object-cover rounded-2xl"
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
          <p className="mt-2 text-xs font-semibold text-violet-600">Book now →</p>
        )}
      </div>
    </button>
  )
}

type ServiceCardsProps = {
  onSelect: (service: ServiceType) => void
  services?: ServiceType[]
  layout?: ServiceCardsLayout
  showCta?: boolean
  titleCentered?: boolean
  className?: string
}

export function ServiceCards({
  onSelect,
  services = DEFAULT_SERVICES,
  layout = 'grid',
  showCta = false,
  titleCentered = false,
  className = '',
}: ServiceCardsProps) {
  const containerClass =
    layout === 'grid'
      ? 'grid grid-cols-3 gap-2 sm:gap-3'
      : 'scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0'

  return (
    <div className={`${containerClass} ${className}`.trim()}>
      {services.map((service) => (
        <ServiceCard
          key={service}
          service={service}
          layout={layout}
          showCta={showCta}
          titleCentered={titleCentered}
          onClick={() => onSelect(service)}
        />
      ))}
    </div>
  )
}
