import { useEffect, useState } from 'react'
import type { SpotlightImage } from '../../api/catalog'
import { fetchCustomerHome } from '../../api/services'
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
  const [spotlights, setSpotlights] = useState<SpotlightImage[]>([])

  const [loadingServices, setLoadingServices] = useState(true)

  const applyHomeData = (data: Awaited<ReturnType<typeof fetchCustomerHome>>) => {
    setActiveBookings(data.booked_count)
    setOpenRequests(data.open_requests)
    setServices(data.services)
    setPopularServices(data.popularServices)
    setComingSoonServices(data.comingSoonServices)
    setSpotlights(data.spotlights)
  }

  const refreshCounts = () => {
    fetchCustomerHome(true)
      .then(applyHomeData)
      .catch(() => {})
  }

  useEffect(() => {
    fetchCustomerHome()
      .then(applyHomeData)
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
      spotlights={spotlights}
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
