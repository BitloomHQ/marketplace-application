import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loadHomeCatalog } from '../api/catalog'
import type { SpotlightImage } from '../api/catalog'
import { CustomerHomeContent } from '../components/CustomerHomeContent'
import { GuestHeader } from '../components/GuestHeader'
import { SiteFooter } from '../components/SiteFooter'
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal'
import { LoginModal } from '../components/auth/LoginModal'
import { RegisterModal } from '../components/auth/RegisterModal'
import { useAuth } from '../context/AuthContext'
import { isProviderRole } from '../lib/format'
import type { ServiceCategory } from '../types'

type AuthView = 'login' | 'register' | 'forgot' | null

export function PublicHomePage() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [services, setServices] = useState<ServiceCategory[]>([])
  const [popularServices, setPopularServices] = useState<ServiceCategory[]>([])
  const [comingSoonServices, setComingSoonServices] = useState<ServiceCategory[]>([])
  const [loadingServices, setLoadingServices] = useState(true)
  const [authView, setAuthView] = useState<AuthView>(null)
  const [loginMessage, setLoginMessage] = useState<string | undefined>()
  const [createOpen, setCreateOpen] = useState(false)
  const [presetService, setPresetService] = useState('plumber')
  const [comingSoonService, setComingSoonService] = useState<ServiceCategory | null>(null)
  const [spotlights, setSpotlights] = useState<SpotlightImage[]>([])

  useEffect(() => {
    if (!isAuthenticated || !user) return
    if (user.role === 'customer') navigate('/customer-dashboard', { replace: true })
    else if (isProviderRole(user.role)) navigate('/provider-dashboard', { replace: true })
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
    const view = searchParams.get('login')
      ? 'login'
      : searchParams.get('register')
        ? 'register'
        : searchParams.get('forgot')
          ? 'forgot'
          : null
    if (view) {
      setAuthView(view)
      searchParams.delete('login')
      searchParams.delete('register')
      searchParams.delete('forgot')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const promptLogin = (message?: string) => {
    setLoginMessage(message)
    setAuthView('login')
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
        open={authView === 'login'}
        onClose={() => {
          setAuthView(null)
          setLoginMessage(undefined)
        }}
        subtitle={loginMessage}
        onSwitchToRegister={() => setAuthView('register')}
        onSwitchToForgotPassword={() => setAuthView('forgot')}
      />

      <RegisterModal
        open={authView === 'register'}
        onClose={() => setAuthView(null)}
        onSwitchToLogin={() => setAuthView('login')}
        onRegistered={(email) => {
          setAuthView(null)
          navigate('/verify-email', { state: { email, portal: 'customer' } })
        }}
      />

      <ForgotPasswordModal
        open={authView === 'forgot'}
        onClose={() => setAuthView(null)}
        onSwitchToLogin={() => setAuthView('login')}
      />

      <SiteFooter />
    </div>
  )
}
