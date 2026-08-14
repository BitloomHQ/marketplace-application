import { useEffect, useState } from 'react'
import { fetchDashboard } from '../../api/accounts'
import { fetchMyServiceRequests } from '../../api/services'
import { CustomerHomeContent } from '../../components/CustomerHomeContent'
import { useAuth } from '../../context/AuthContext'
import type { ServiceCategory } from '../../types'

export function CustomerDashboard() {
  const { user } = useAuth()
  const [activeBookings, setActiveBookings] = useState(0)
  const [openRequests, setOpenRequests] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [presetService, setPresetService] = useState('plumber')
  const [services, setServices] = useState<ServiceCategory[]>([])
  const [popularServices, setPopularServices] = useState<ServiceCategory[]>([])
  const [comingSoonServices, setComingSoonServices] = useState<ServiceCategory[]>([])
  const [comingSoonService, setComingSoonService] = useState<ServiceCategory | null>(null)
  const [loadingServices, setLoadingServices] = useState(true)

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
        const all = res.data.services ?? []
        setServices(all)
        setPopularServices(res.data.popular_services ?? [])
        setComingSoonServices(all.filter((s) => s.status === 'coming_soon'))
      })
      .catch(() => {
        setServices([])
        setPopularServices([])
        setComingSoonServices([])
      })
      .finally(() => setLoadingServices(false))
  }, [])

  const openCreate = (service?: string) => {
    setPresetService(service ?? 'plumber')
    setCreateOpen(true)
  }

  return (
    <CustomerHomeContent
      userName={user?.username}
      services={services}
      popularServices={popularServices}
      comingSoonServices={comingSoonServices}
      loadingServices={loadingServices}
      activeBookings={activeBookings}
      openRequests={openRequests}
      showStats
      createOpen={createOpen}
      presetService={presetService}
      comingSoonService={comingSoonService}
      onCreateOpenChange={setCreateOpen}
      onPresetServiceChange={setPresetService}
      onComingSoonChange={setComingSoonService}
      onBookService={() => openCreate()}
      onSelectService={(key) => openCreate(key)}
      onRequestCreated={refreshCounts}
    />
  )
}
