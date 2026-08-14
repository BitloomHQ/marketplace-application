import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
        className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1 pl-1 pr-2 shadow-sm transition hover:border-zinc-300 sm:gap-2 sm:pr-3"
        aria-label="Account menu"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-sm font-bold text-violet-700 sm:h-9 sm:w-9">
          {user.profile_picture ? (
            <img src={user.profile_picture} alt="" className="h-full w-full object-cover" />
          ) : (
            user.username.charAt(0).toUpperCase()
          )}
        </span>
        <span className="hidden max-w-[120px] truncate text-sm font-semibold text-zinc-900 sm:block">
          {user.username}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(calc(100vw-1.5rem),14rem)] overflow-hidden rounded-2xl border border-zinc-200 bg-white py-1 shadow-xl sm:w-56">
          <div className="border-b border-zinc-100 px-4 py-3">
            <p className="truncate font-semibold text-zinc-900">{user.username}</p>
            <p className="mt-0.5 break-all text-xs text-zinc-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              navigate('/profile')
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Account
          </button>
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/admin-dashboard')
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Admin dashboard
            </button>
          )}
          {user.role === 'customer' && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/customer/addresses')
              }}
              className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50"
            >
              My addresses
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-4 py-2.5 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
