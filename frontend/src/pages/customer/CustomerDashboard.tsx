import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import heroImg from '../../assets/hero.png'
import { CreateRequestModal } from '../../components/CreateRequestModal'
import { fetchMyServiceRequests } from '../../api/services'
import { Button, SectionTitle } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { ServiceCards } from '../../components/ServiceCards'
import type { ServiceType } from '../../types'

export function CustomerDashboard() {
  const { user } = useAuth()
  const [activeBookings, setActiveBookings] = useState(0)
  const [openRequests, setOpenRequests] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [presetService, setPresetService] = useState<ServiceType>('plumber')

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
  }, [])

  const openCreate = (service?: ServiceType) => {
    setPresetService(service ?? 'plumber')
    setCreateOpen(true)
  }

  const firstName = user?.username?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-violet-800 px-4 py-5 text-white shadow-lg shadow-violet-600/25 sm:px-5 sm:py-6">
        <div className="relative z-10 pr-24 sm:max-w-[58%] sm:pr-0">
          <p className="text-sm font-medium text-violet-200">Hello, {firstName} 👋</p>
          <h1 className="mt-1 text-xl font-bold leading-tight sm:text-2xl">
            Home services at your doorstep
          </h1>
          <p className="mt-2 text-sm text-violet-100/90">
            Book verified plumbers, electricians & gardeners near you.
          </p>
          <Button
            className="mt-4 w-full !bg-white !text-violet-700 hover:!bg-violet-50 sm:w-auto"
            onClick={() => openCreate()}
          >
            Book a service
          </Button>
        </div>
        <img
          src={heroImg}
          alt=""
          className="pointer-events-none absolute -right-1 bottom-0 h-28 w-auto object-contain opacity-95 sm:-right-2 sm:h-36"
        />
      </section>

      {(activeBookings > 0 || openRequests > 0) && (
        <div className="flex gap-3  pb-1">
          {openRequests > 0 && (
            <Link
              to="/customer/requests"
              className="bg-violet-50 px-4 py-3 md:py-4 w-full rounded-2xl border border-zinc-200"
            >
              <p className="text-xs font-medium text-violet-600">Waiting for quotes</p>
              <p className="text-lg font-bold text-violet-900">{openRequests}</p>
            </Link>
          )}
          {activeBookings > 0 && (
            <Link
              to="/customer/bookings"
              className="bg-white px-4 py-3 md:py-4 w-full rounded-2xl border border-zinc-200"
            >
              <p className="text-xs font-medium text-zinc-500">Active bookings</p>
              <p className="text-lg font-bold text-zinc-900">{activeBookings}</p>
            </Link>
          )}
        </div>
      )}

      <section>
        <SectionTitle>Our Services</SectionTitle>
        <ServiceCards layout="scroll" titleCentered onSelect={openCreate} />
      </section>

      <section>
        <SectionTitle>Popular services</SectionTitle>
        <ServiceCards layout="scroll" showCta onSelect={openCreate} />
      </section>

      <CreateRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        initialServiceType={presetService}
        onCreated={refreshCounts}
      />
    </div>
  )
}
