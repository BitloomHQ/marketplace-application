import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { formatService } from '../lib/format'
import { SERVICE_META } from '../lib/serviceMeta'
import { DEFAULT_SERVICE_IMAGE } from '../lib/defaultServiceImage'
import { resolveMediaUrl } from '../lib/media'
import type { ServiceCategory, ServiceType } from '../types'

const DEFAULT_SERVICES: ServiceType[] = ['plumber', 'electrician', 'gardener']

function categoryImage(category: ServiceCategory): string {
  const fromApi = category.service_image ? resolveMediaUrl(category.service_image) : null
  return fromApi ?? DEFAULT_SERVICE_IMAGE
}

type ServiceCardsLayout = 'grid' | 'scroll'
type ServiceCardsVariant = 'card' | 'circle'

type ServiceCardProps = {
  service: ServiceType
  layout: ServiceCardsLayout
  variant: ServiceCardsVariant
  titleCentered?: boolean
  onClick: () => void
}

function ServiceCard({
  service,
  layout,
  variant,
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
        className="group flex flex-col items-center text-center transition active:scale-[0.97]"
      >
        <div className="relative h-[5.5rem] w-[5.5rem] overflow-hidden rounded-full bg-sky-100 ring-[3px] ring-sky-100 shadow-md transition group-hover:ring-sky-300 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-40 lg:w-40">
          <img
            src={DEFAULT_SERVICE_IMAGE}
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
        src={DEFAULT_SERVICE_IMAGE}
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
      </div>
    </button>
  )
}

type ServiceCardsProps = {
  onSelect: (serviceKey: string) => void
  onComingSoon?: (category: ServiceCategory) => void
  services?: ServiceType[]
  categories?: ServiceCategory[]
  layout?: ServiceCardsLayout
  variant?: ServiceCardsVariant
  titleCentered?: boolean
  className?: string
}

function CategoryCircleCard({
  category,
  onSelect,
  onComingSoon,
}: {
  category: ServiceCategory
  onSelect: (serviceKey: string) => void
  onComingSoon?: (category: ServiceCategory) => void
}) {
  const isActive = category.status === 'active'
  const isComingSoon = category.status === 'coming_soon'
  const imageSrc = categoryImage(category)

  const handleClick = () => {
    if (isActive) {
      onSelect(category.key)
      return
    }
    if (isComingSoon && onComingSoon) {
      onComingSoon(category)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group flex flex-col items-center text-center transition ${
        isActive || isComingSoon ? 'cursor-pointer active:scale-[0.97]' : 'cursor-default'
      }`}
    >
      <div className="relative h-[5.5rem] w-[5.5rem] overflow-hidden rounded-full bg-sky-100 ring-[3px] ring-sky-100 shadow-md sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-40 lg:w-40">
        <img
          src={imageSrc}
          alt={category.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {isComingSoon && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 px-2">
            <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-white sm:text-xs">
              Coming
              <br />
              Soon
            </span>
          </div>
        )}
      </div>
      <p className="mt-3 text-sm font-bold sm:text-base">{category.name}</p>
      <p className="mt-1 line-clamp-2 px-1 text-xs leading-snug text-zinc-500 sm:text-sm">
        {category.description}
      </p>
      {!isActive && !isComingSoon && (
        <p className="mt-2 text-xs font-semibold text-zinc-400 sm:text-sm">Unavailable</p>
      )}
    </button>
  )
}

const CIRCLE_SLOT_WIDTH = [
  'w-[calc((100%-4*1rem)/5)]',
  'sm:w-[calc((100%-4*1.5rem)/5)]',
  'md:w-[calc((100%-4*2rem)/5)]',
].join(' ')

const CIRCLE_ITEM_BASE = `flex shrink-0 flex-col items-center ${CIRCLE_SLOT_WIDTH}`

function circleLayoutClasses(count: number) {
  const useSlider = count > 5

  return {
    useSlider,
    container: useSlider
      ? 'scrollbar-none flex w-full gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:gap-6 md:gap-8'
      : 'flex w-full gap-4 justify-start items-start sm:gap-6 md:gap-8',
    item: useSlider ? `${CIRCLE_ITEM_BASE} snap-start` : CIRCLE_ITEM_BASE,
  }
}

function CircleScrollRow({
  count,
  className,
  children,
}: {
  count: number
  className: string
  children: ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(count > 5)

  const updateScrollHints = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }, [])

  useEffect(() => {
    updateScrollHints()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', updateScrollHints, { passive: true })
    window.addEventListener('resize', updateScrollHints)
    return () => {
      el.removeEventListener('scroll', updateScrollHints)
      window.removeEventListener('resize', updateScrollHints)
    }
  }, [updateScrollHints, count])

  const scrollByPage = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = Math.max(el.clientWidth * 0.75, 160)
    el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' })
  }

  const layout = circleLayoutClasses(count)

  if (!layout.useSlider) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className="relative">
      {canScrollLeft && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-zinc-100 via-zinc-100/80 to-transparent sm:w-14"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => scrollByPage('left')}
            className="absolute left-0 top-[2.75rem] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-600 shadow-md transition hover:bg-white hover:text-zinc-900 sm:top-[3.5rem] sm:h-10 sm:w-10 md:top-16 lg:top-20"
            aria-label="Scroll to previous services"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </>
      )}

      {canScrollRight && (
        <>
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-zinc-100 via-zinc-100/80 to-transparent sm:w-14"
            aria-hidden
          />
          <button
            type="button"
            onClick={() => scrollByPage('right')}
            className="absolute right-0 top-[2.75rem] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-600 shadow-md transition hover:bg-white hover:text-zinc-900 sm:top-[3.5rem] sm:h-10 sm:w-10 md:top-16 lg:top-20"
            aria-label="Scroll to more services"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      <div ref={scrollRef} className={className}>
        {children}
      </div>

      {canScrollRight && (
        <p className="mt-3 text-center text-xs font-medium text-zinc-400 sm:text-sm">
          Swipe or use arrows to see more services
        </p>
      )}
    </div>
  )
}

export function ServiceCards({
  onSelect,
  onComingSoon,
  services = DEFAULT_SERVICES,
  categories,
  layout = 'grid',
  variant = 'card',
  titleCentered = false,
  className = '',
}: ServiceCardsProps) {
  const count = categories?.length ?? services.length
  const circleLayout = variant === 'circle' ? circleLayoutClasses(count) : null

  const containerClass =
    variant === 'circle'
      ? circleLayout!.container
      : layout === 'grid'
        ? 'flex gap-2 sm:gap-3'
        : 'scrollbar-none flex gap-3 overflow-x-auto px-4 pb-1 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0'

  if (categories !== undefined) {
    if (categories.length === 0) {
      return null
    }

    return (
      <CircleScrollRow count={count} className={`${containerClass} ${className}`.trim()}>
        {categories.map((category) => (
          <div key={category.id ?? category.key} className={circleLayout?.item}>
            <CategoryCircleCard
              category={category}
              onSelect={onSelect}
              onComingSoon={onComingSoon}
            />
          </div>
        ))}
      </CircleScrollRow>
    )
  }

  return (
    <CircleScrollRow count={count} className={`${containerClass} ${className}`.trim()}>
      {services.map((service) => (
        <div key={service} className={circleLayout?.item}>
          <ServiceCard
            service={service}
            layout={layout}
            variant={variant}
            titleCentered={titleCentered}
            onClick={() => onSelect(service)}
          />
        </div>
      ))}
    </CircleScrollRow>
  )
}
