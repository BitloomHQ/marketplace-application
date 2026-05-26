import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatService, isProviderRole, roleLabel } from '../lib/format'

export function UserMenuDropdown() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  if (!user) return null

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left transition hover:border-slate-600 hover:bg-slate-800"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/30 text-sm font-semibold text-violet-300">
          {user.username.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:block">
          <span className="block text-sm font-medium text-white">{user.username}</span>
          <span className="block text-xs text-slate-400">
            {roleLabel(user.role)}
            {isProviderRole(user.role) && ` · ${formatService(user.role)}`}
          </span>
        </span>
        <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-2xl">
          <div className="border-b border-slate-800 px-4 py-3 sm:hidden">
            <p className="font-medium text-white">{user.username}</p>
            <p className="text-xs text-slate-400">{roleLabel(user.role)}</p>
          </div>
          <div className="px-4 py-2 text-xs text-slate-500">
            <p className="truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-4 py-2.5 text-left text-sm text-rose-400 transition hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
