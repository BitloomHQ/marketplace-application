import { Link } from 'react-router-dom'
import { ComingSoonServiceModal } from './ComingSoonServiceModal'
import { CreateRequestModal } from './CreateRequestModal'
import { ServiceCards } from './ServiceCards'
import {
  NoteworthyGridSkeleton,
  ServiceCirclesSkeleton,
} from './Shimmer'
import { Button, SectionTitle } from './ui'
import type { SpotlightImage } from '../api/catalog'
import { DEFAULT_SERVICE_IMAGE } from '../lib/defaultServiceImage'
import { resolveMediaUrl } from '../lib/media'
import type { ServiceCategory } from '../types'
import backgroundImage from '/bg.png'

function serviceImage(category: ServiceCategory): string {
  const fromApi = category.service_image ? resolveMediaUrl(category.service_image) : null
  return fromApi ?? DEFAULT_SERVICE_IMAGE
}

const SPOTLIGHT_IMAGES = [
  { src: '/spotlight1.png', alt: 'Spotlight offer 1' },
  { src: '/spotlight2.png', alt: 'Spotlight offer 2' },
  { src: '/spotlight3.png', alt: 'Spotlight offer 3' },
] as const

type SpotlightCardProps = {
  image: string
  alt: string
  onBook: () => void
}

function SpotlightCard({ image, alt, onBook }: SpotlightCardProps) {
  return (
    <button
      type="button"
      onClick={onBook}
      className="w-[min(88vw,20rem)] shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md sm:w-auto sm:flex-1"
    >
      <img src={image} alt={alt} className="w-full" loading="lazy" />
    </button>
  )
}

function NoteworthyCard({
  category,
  onClick,
}: {
  category: ServiceCategory
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-[3/4] overflow-hidden sm:aspect-[4/5]">
        <img
          src={serviceImage(category)}
          alt={category.name}
          className="h-full w-full object-cover transition group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-sm font-bold text-white">{category.name}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
            Coming soon
          </p>
        </div>
      </div>
    </button>
  )
}

export type CustomerHomeContentProps = {
  userName?: string
  services: ServiceCategory[]
  popularServices: ServiceCategory[]
  comingSoonServices: ServiceCategory[]
  spotlights?: SpotlightImage[]
  loadingServices?: boolean
  activeBookings?: number
  openRequests?: number
  showStats?: boolean
  createOpen: boolean
  presetService: string
  comingSoonService: ServiceCategory | null
  onCreateOpenChange: (open: boolean) => void
  onPresetServiceChange: (key: string) => void
  onComingSoonChange: (service: ServiceCategory | null) => void
  onBookService: () => void
  onSelectService: (key: string) => void
  onRequestCreated?: () => void
}

export function CustomerHomeContent({
  userName,
  services,
  popularServices,
  comingSoonServices,
  spotlights = [],
  loadingServices = false,
  activeBookings = 0,
  openRequests = 0,
  showStats = false,
  createOpen,
  presetService,
  comingSoonService,
  onCreateOpenChange,
  onPresetServiceChange,
  onComingSoonChange,
  onBookService,
  onSelectService,
  onRequestCreated,
}: CustomerHomeContentProps) {
  const firstName = userName?.split(' ')[0] ?? 'there'
  const bookableServices = popularServices.length > 0
    ? popularServices
    : services.filter((s) => s.status === 'active')

  const handleSelect = (key: string) => {
    onPresetServiceChange(key)
    onSelectService(key)
  }

  const activeServices = services.filter((service) => service.status === 'active')

  const spotlightItems =
    spotlights.length > 0
      ? spotlights.map((item) => ({
          src: resolveMediaUrl(item.image_url) ?? item.image_url ?? '/spotlight1.png',
          alt: item.title,
        }))
      : SPOTLIGHT_IMAGES.map((item) => ({ src: item.src, alt: item.alt }))

  return (
    <div className="space-y-10 pb-4">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-sky-700 px-5 py-8 text-white sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 "
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.25) 0%, transparent 50%), url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            {userName && (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-sky-100">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs">
                  👋
                </span>
                Hello, {firstName}
              </p>
            )}
            <h1 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
              Trusted home experts, one tap away
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-sky-100/90 sm:text-base">
              Book verified professionals for repairs, maintenance, and everyday home needs —
              reliable service delivered right to your doorstep.
            </p>
            <Button
              type="button"
              className="mt-6 w-full !rounded-full !bg-white !px-6 !py-3 !text-sm !font-bold !text-sky-700 shadow-lg hover:!bg-sky-50 sm:w-auto"
              onClick={onBookService}
            >
              Book a service
            </Button>
          </div>
        </div>
      </section>

      {showStats && (activeBookings > 0 || openRequests > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {openRequests > 0 && (
            <Link
              to="/customer/requests"
              className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-4 transition hover:border-sky-200 hover:shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
                Waiting for quotes
              </p>
              <p className="mt-1 text-2xl font-bold text-sky-900">{openRequests}</p>
            </Link>
          )}
          {activeBookings > 0 && (
            <Link
              to="/customer/bookings"
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 transition hover:shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Active bookings
              </p>
              <p className="mt-1 text-2xl font-bold text-zinc-900">{activeBookings}</p>
            </Link>
          )}
        </div>
      )}

      <section>
        <SectionTitle subtitle="Choose a category and get matched with nearby pros">
          Services at your fingertips
        </SectionTitle>
        {loadingServices ? (
          <ServiceCirclesSkeleton />
        ) : (
          <ServiceCards
            variant="circle"
            titleCentered
            categories={activeServices}
            onSelect={handleSelect}
            onComingSoon={onComingSoonChange}
          />
        )}
      </section>

      <section>
        <SectionTitle subtitle="Featured offers from verified professionals">
          In the spotlight
        </SectionTitle>
        <div className="scrollbar-none flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
          {spotlightItems.map((item, index) => {
            const linkedService = bookableServices[index]
            return (
              <SpotlightCard
                key={item.src}
                image={item.src}
                alt={item.alt}
                onBook={() =>
                  linkedService ? handleSelect(linkedService.key) : onBookService()
                }
              />
            )
          })}
        </div>
      </section>

      {loadingServices ? (
        <section>
          <SectionTitle subtitle="Most booked this week in your area">
            Popular services
          </SectionTitle>
          <ServiceCirclesSkeleton count={3} />
        </section>
      ) : popularServices.length > 0 ? (
        <section>
          <SectionTitle subtitle="Most booked this week in your area">
            Popular services
          </SectionTitle>
          <ServiceCards
            variant="circle"
            titleCentered
            categories={popularServices}
            onSelect={handleSelect}
            onComingSoon={onComingSoonChange}
          />
        </section>
      ) : null}

      {loadingServices ? (
        <section>
          <SectionTitle subtitle="Exciting new categories launching soon">
            New and noteworthy
          </SectionTitle>
          <NoteworthyGridSkeleton count={5} />
        </section>
      ) : comingSoonServices.length > 0 ? (
        <section>
          <SectionTitle subtitle="Exciting new categories launching soon">
            New and noteworthy
          </SectionTitle>
          <div className="scrollbar-none flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:pb-0 md:grid-cols-5">
            {comingSoonServices.map((category) => (
              <div
                key={category.id ?? category.key}
                className="w-[min(72vw,14rem)] shrink-0 snap-start sm:w-auto"
              >
                <NoteworthyCard
                  category={category}
                  onClick={() => onComingSoonChange(category)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <CreateRequestModal
        open={createOpen}
        onClose={() => onCreateOpenChange(false)}
        initialServiceType={presetService}
        onCreated={onRequestCreated}
      />

      <ComingSoonServiceModal
        open={comingSoonService !== null}
        service={comingSoonService}
        onClose={() => onComingSoonChange(null)}
      />
    </div>
  )
}
