import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { HamburgerButton } from '../MobileDrawerMenu'
import { NotificationBell } from '../NotificationBell'
import { NotificationToasts } from '../NotificationToasts'
import { UserMenuDropdown } from '../UserMenuDropdown'
import logo from '/logo.png'

type NavIconName =
  | 'dashboard'
  | 'clock'
  | 'providers'
  | 'customers'
  | 'users'
  | 'services'
  | 'marketplace'

type AdminNavItem = {
  to: string
  label: string
  icon: NavIconName
  end?: boolean
}

type AdminNavSection = {
  title: string
  items: AdminNavItem[]
}

export const ADMIN_NAV: AdminNavSection[] = [
  {
    title: 'Overview',
    items: [{ to: '/admin-dashboard', label: 'Dashboard', icon: 'dashboard', end: true }],
  },
  {
    title: 'User management',
    items: [
      { to: '/admin/pending-providers', label: 'Pending providers', icon: 'clock' },
      { to: '/admin/providers', label: 'Providers', icon: 'providers' },
      { to: '/admin/customers', label: 'Customers', icon: 'customers' },
      { to: '/admin/admin-users', label: 'Admin users', icon: 'users' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { to: '/admin/services', label: 'Services', icon: 'services' },
      { to: '/admin/marketplace', label: 'Marketplace', icon: 'marketplace' },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/admin-dashboard': 'Dashboard',
  '/admin/pending-providers': 'Pending providers',
  '/admin/providers': 'Providers',
  '/admin/customers': 'Customers',
  '/admin/admin-users': 'Admin users',
  '/admin/services': 'Services',
  '/admin/marketplace': 'Marketplace',
  '/profile': 'Account',
}

function SidebarIcon({ name }: { name: NavIconName }) {
  const paths: Record<NavIconName, ReactNode> = {
    dashboard: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
      />
    ),
    clock: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    providers: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 6V8a2 2 0 00-2-2H8a2 2 0 00-2 2v4"
      />
    ),
    customers: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
    users: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    ),
    services: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    ),
    marketplace: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    ),
  }

  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {paths[name]}
    </svg>
  )
}

function sidebarLinkClass(isActive: boolean) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? 'bg-violet-600 text-white shadow-sm shadow-violet-900/30'
      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
  }`
}

function AdminSidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {ADMIN_NAV.map((section) => (
        <div key={section.title}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={onNavigate}
                  className={({ isActive }) => sidebarLinkClass(isActive)}
                >
                  <SidebarIcon name={item.icon} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function AdminRouteGuard() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  if (!user || user.role !== 'admin') return null

  const allowed =
    pathname === '/admin-dashboard' ||
    pathname.startsWith('/admin/') ||
    pathname === '/profile'

  if (!allowed) {
    return <Navigate to="/admin-dashboard" replace />
  }
  return null
}

export function AdminLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  if (!user) return null

  const pageTitle = PAGE_TITLES[pathname] ?? 'Admin'

  return (
    <div className="min-h-screen bg-zinc-100">
      <AdminRouteGuard />
      <NotificationToasts />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-zinc-800/80 bg-zinc-950 lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-zinc-800/80 px-5">
          <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              Zep<span className="text-violet-400">Serve</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Admin panel
            </p>
          </div>
        </div>

        <AdminSidebarNav />

        <div className="border-t border-zinc-800/80 p-3">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                isActive ? 'bg-violet-600 text-white' : 'bg-zinc-900/80 text-zinc-300 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-600 text-sm font-bold text-white">
              {user.profile_picture ? (
                <img src={user.profile_picture} alt="" className="h-full w-full object-cover" />
              ) : (
                user.username.charAt(0).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.username}</p>
              <p className="truncate text-xs opacity-70">Account settings</p>
            </div>
          </NavLink>
        </div>
      </aside>

      {/* Mobile sidebar drawer */}
      {mobileOpen &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[100] bg-black/50 lg:hidden"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-[110] flex w-[min(100vw-4rem,17rem)] flex-col border-r border-zinc-800/80 bg-zinc-950 lg:hidden">
              <div className="flex h-14 items-center justify-between border-b border-zinc-800/80 px-4">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="" className="h-8 w-8 rounded-lg" />
                  <span className="text-sm font-bold text-white">
                    Zep<span className="text-violet-400">Serve</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 hover:bg-white/5 hover:text-white"
                  aria-label="Close menu"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <AdminSidebarNav onNavigate={() => setMobileOpen(false)} />
            </aside>
          </>,
          document.body,
        )}

      {/* Main column */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <HamburgerButton
                  open={mobileOpen}
                  onClick={() => setMobileOpen((v) => !v)}
                  label="Open admin menu"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">
                  Admin
                </p>
                <h1 className="truncate text-lg font-bold text-zinc-900 sm:text-xl">{pageTitle}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <NotificationBell />
              <UserMenuDropdown />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
