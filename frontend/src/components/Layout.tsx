import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isProviderRole } from '../lib/format'
import { NotificationBell } from './NotificationBell'
import { NotificationToasts } from './NotificationToasts'
import { UserMenuDropdown } from './UserMenuDropdown'

type NavItem = { to: string; label: string }

function customerNav(): NavItem[] {
  return [
    { to: '/customer-dashboard', label: 'Dashboard' },
    { to: '/customer/create-request', label: 'New Request' },
    { to: '/customer/bookings', label: 'My Bookings' },
  ]
}

function providerNav(role: string): NavItem[] {
  const base = role === 'gardener' ? '/gardener-dashboard' : role === 'electrician' ? '/electrician-dashboard' : '/plumber-dashboard'
  return [
    { to: base, label: 'Dashboard' },
    { to: '/provider/leads', label: 'Leads' },
    { to: '/provider/bookings', label: 'Bookings' },
  ]
}

export function Layout() {
  const { user } = useAuth()

  if (!user) return null

  const nav = user.role === 'customer' ? customerNav() : isProviderRole(user.role) ? providerNav(user.role) : []

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <NotificationToasts />
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to={nav[0]?.to ?? '/'} className="font-semibold text-white">
            Home<span className="text-violet-400">Services</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm transition ${isActive ? 'bg-violet-600/20 text-violet-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <UserMenuDropdown />
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-800 px-4 py-2 sm:hidden">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs ${isActive ? 'bg-violet-600/20 text-violet-300' : 'text-slate-400'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Outlet />
      </div>
    </div>
  )
}
