import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loadHomeCatalog } from '../api/catalog'
import type { SpotlightImage } from '../api/catalog'
import { CustomerHomeContent } from '../components/CustomerHomeContent'
import { GuestHeader } from '../components/GuestHeader'
import { SiteFooter } from '../components/SiteFooter'
import { LoginModal } from '../components/auth/LoginModal'
import { useAuth } from '../context/AuthContext'
import { isProviderRole } from '../lib/format'
import type { ServiceCategory } from '../types'

export function PublicHomePage() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [services, setServices] = useState<ServiceCategory[]>([])
  const [popularServices, setPopularServices] = useState<ServiceCategory[]>([])
  const [comingSoonServices, setComingSoonServices] = useState<ServiceCategory[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginMessage, setLoginMessage] = useState<string | undefined>()
  const [createOpen, setCreateOpen] = useState(false)
  const [presetService, setPresetService] = useState('plumber')
  const [comingSoonService, setComingSoonService] = useState<ServiceCategory | null>(null)
  const [spotlights, setSpotlights] = useState<SpotlightImage[]>([])

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (user.role === 'customer') navigate('/customer-dashboard', { replace: true })
    else if (isProviderRole(user.role)) navigate('/provider-dashboard', { replace: true })
    else if (user.role === 'admin') navigate('/admin-dashboard', { replace: true })
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    loadHomeCatalog()
      .then((catalog) => {
        setServices(catalog.services)
        setPopularServices(catalog.popularServices)
        setComingSoonServices(catalog.comingSoonServices)
        setSpotlights(catalog.spotlights)
      })
      .catch(() => {
        setServices([])
        setPopularServices([])
        setComingSoonServices([])
      })
      .finally(() => setLoadingServices(false))
  }, [])

  useEffect(() => {
    if (searchParams.get('login') === '1') {
      setLoginOpen(true)
      searchParams.delete('login')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const promptLogin = (message?: string) => {
    setLoginMessage(message)
    setLoginOpen(true)
  }

  const handleBookService = () => {
    promptLogin('Before you book a service, please log in first.')
  }

  const handleSelectService = (key: string) => {
    setPresetService(key)
    promptLogin('Before you book a service, please log in first.')
  }

  return (
    <div className="min-h-screen bg-zinc-100">
      <GuestHeader onLoginClick={() => promptLogin()} />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-6">
        <CustomerHomeContent
          services={services}
          popularServices={popularServices}
          comingSoonServices={comingSoonServices}
          spotlights={spotlights}
          loadingServices={loadingServices}
          createOpen={createOpen}
          presetService={presetService}
          comingSoonService={comingSoonService}
          onCreateOpenChange={setCreateOpen}
          onPresetServiceChange={setPresetService}
          onComingSoonChange={setComingSoonService}
          onBookService={handleBookService}
          onSelectService={handleSelectService}
        />
      </main>

      <LoginModal
        open={loginOpen}
        onClose={() => {
          setLoginOpen(false)
          setLoginMessage(undefined)
        }}
        subtitle={loginMessage}
      />

      <SiteFooter />
    </div>
  )
}
