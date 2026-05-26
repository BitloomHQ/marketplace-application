import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isProviderRole } from '../lib/format'
import { NotificationBell } from './NotificationBell'
import { NotificationToasts } from './NotificationToasts'
import { UserMenuDropdown } from './UserMenuDropdown'

type NavItem = { to: string; label: string; icon: 'home' | 'list' | 'calendar' | 'briefcase' }

function NavIcon({ name, active }: { name: NavItem['icon']; active: boolean }) {
  const c = active ? 'text-violet-600' : 'text-zinc-400'
  const paths: Record<NavItem['icon'], ReactNode> = {
    home: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
    list: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    ),
    calendar: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
    briefcase: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 6V8a2 2 0 00-2-2H8a2 2 0 00-2 2v4" />
    ),
  }
  return (
    <svg className={`h-6 w-6 shrink-0 ${c}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {paths[name]}
    </svg>
  )
}

function customerNav(): NavItem[] {
  return [
    { to: '/customer-dashboard', label: 'Home', icon: 'home' },
    { to: '/customer/requests', label: 'Requests', icon: 'list' },
    { to: '/customer/bookings', label: 'Bookings', icon: 'calendar' },
  ]
}

function providerNav(role: string): NavItem[] {
  const base =
    role === 'gardener'
      ? '/gardener-dashboard'
      : role === 'electrician'
        ? '/electrician-dashboard'
        : '/plumber-dashboard'
  return [
    { to: base, label: 'Home', icon: 'home' },
    { to: '/provider/leads', label: 'Jobs', icon: 'briefcase' },
    { to: '/provider/bookings', label: 'Schedule', icon: 'calendar' },
  ]
}

function headerNavClass(isActive: boolean) {
  return `flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-violet-100 text-violet-700' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
  }`
}

function bottomNavClass(isActive: boolean) {
  return `flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 text-[11px] font-semibold transition ${
    isActive ? 'bg-violet-50 text-violet-700' : 'text-zinc-500 active:bg-zinc-100'
  }`
}

export function Layout() {
  const { user } = useAuth()

  if (!user) return null

  const nav = user.role === 'customer' ? customerNav() : isProviderRole(user.role) ? providerNav(user.role) : []

  return (
    <div className="min-h-screen bg-zinc-100">
      <NotificationToasts />
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:py-3">
          <Link to={nav[0]?.to ?? '/'} className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white shadow-md shadow-violet-600/25">
              HS
            </span>
            <span className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg">
              Home<span className="text-violet-600">Services</span>
            </span>
          </Link>

          {/* Desktop: tabs beside logo, not centered */}
          {nav.length > 0 && (
            <nav className="ml-1 hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
              {nav.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => headerNavClass(isActive)}>
                  {({ isActive }) => (
                    <>
                      <NavIcon name={item.icon} active={isActive} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            <NotificationBell />
            <UserMenuDropdown />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-4 pb-tab-bar lg:py-5 lg:pb-8">
        <Outlet />
      </main>

      {/* Phones & tablets: thumb-friendly bottom tabs */}
      {nav.length > 0 && (
        <nav
          className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.06)] backdrop-blur-md lg:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          aria-label="Main navigation"
        >
          <div className="mx-auto flex max-w-7xl gap-1 px-2 pt-1.5 pb-1.5">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.icon === 'home'}
                className={({ isActive }) => bottomNavClass(isActive)}
              >
                {({ isActive }) => (
                  <>
                    <NavIcon name={item.icon} active={isActive} />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-violet-50 via-white to-zinc-50">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
