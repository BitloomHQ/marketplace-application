import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchDashboard } from '../../api/accounts'
import { fetchMyServiceRequests, fetchPopularProviders } from '../../api/services'
import { ComingSoonServiceModal } from '../../components/ComingSoonServiceModal'
import { CreateRequestModal } from '../../components/CreateRequestModal'
import { ProviderAvatar } from '../../components/ProviderAvatar'
import { StarRating } from '../../components/StarRating'
import { Button, Card, SectionTitle } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { ServiceCards } from '../../components/ServiceCards'
import { formatService } from '../../lib/format'
import type { PopularProvider, ServiceCategory } from '../../types'
import backgroundImage from '../../assets/bg.png'

function PopularProviderCard({ provider }: { provider: PopularProvider }) {
  return (
    <Card className="flex items-center gap-3">
      <ProviderAvatar name={provider.username} imageUrl={provider.profile_picture} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-zinc-900">{provider.username}</p>
          {provider.is_verified && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Verified
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-500">{formatService(provider.role)}</p>
        <StarRating rating={provider.average_rating} totalReviews={provider.total_reviews} />
      </div>
    </Card>
  )
}

export function CustomerDashboard() {
  const { user } = useAuth()
  const [activeBookings, setActiveBookings] = useState(0)
  const [openRequests, setOpenRequests] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [presetService, setPresetService] = useState('plumber')
  const [services, setServices] = useState<ServiceCategory[] | undefined>(undefined)
  const [popularServices, setPopularServices] = useState<ServiceCategory[] | undefined>(undefined)
  const [popularProviders, setPopularProviders] = useState<PopularProvider[]>([])
  const [comingSoonService, setComingSoonService] = useState<ServiceCategory | null>(null)

  const refreshCounts = () => {
    fetchMyServiceRequests(1, 1)
      .then((res) => {
        setActiveBookings(res.booked_count)
        setOpenRequests(res.total - res.booked_count)
      })
      .catch(() => {})
  }

  useEffect(() => {
    refreshCounts()
    fetchDashboard()
      .then((res) => {
        setServices(res.data.services ?? [])
        setPopularServices(res.data.popular_services ?? [])
      })
      .catch(() => {})
    fetchPopularProviders()
      .then((res) => setPopularProviders(res.providers))
      .catch(() => setPopularProviders([]))
  }, [])

  const openCreate = (service?: string) => {
    setPresetService(service ?? 'plumber')
    setCreateOpen(true)
  }

  const firstName = user?.username?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-8">
      <section
        className="relative h-80 rounded-[1.75rem] bg-cover bg-center px-5 py-6 text-white sm:px-7 sm:py-8"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="relative z-10 flex sm:items-center sm:justify-between">
          <div className="w-full relative">
            <p className="inline-flex items-center gap-2 text-base font-medium text-sky-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs">
                👋
              </span>
              Hello, {firstName}
            </p>
            <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
              Trusted home experts, one tap away
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-sky-100/90 sm:text-[15px]">
              Book verified professionals for repairs, maintenance, and everyday home needs —
              reliable service delivered right to your doorstep.
            </p>
            <Button
              className="mt-5 w-full !rounded-full !bg-white !px-6 !py-3 !text-sm !font-bold !text-sky-700 shadow-lg shadow-sky-950/20 hover:!bg-sky-50 sm:w-auto"
              onClick={() => openCreate()}
            >
              Book a service
            </Button>
          </div>
        </div>
      </section>

      {(activeBookings > 0 || openRequests > 0) && (
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
        <ServiceCards
          variant="circle"
          titleCentered
          categories={services}
          onSelect={openCreate}
          onComingSoon={setComingSoonService}
        />
      </section>

      {popularServices && popularServices.length > 0 && (
        <section>
          <SectionTitle subtitle="Most booked this week in your area">
            Popular services
          </SectionTitle>
          <ServiceCards
            variant="circle"
            categories={popularServices}
            onSelect={openCreate}
            onComingSoon={setComingSoonService}
          />
        </section>
      )}

      {popularProviders.length > 0 && (
        <section>
          <SectionTitle subtitle="Top-rated professionals near you">
            Popular providers
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {popularProviders.map((provider) => (
              <PopularProviderCard key={provider.id} provider={provider} />
            ))}
          </div>
        </section>
      )}

      <CreateRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialServiceType={presetService}
        onCreated={refreshCounts}
      />

      <ComingSoonServiceModal
        open={comingSoonService !== null}
        service={comingSoonService}
        onClose={() => setComingSoonService(null)}
      />
    </div>
  )
}
