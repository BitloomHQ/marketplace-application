import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button } from './ui'
import { HamburgerButton, MobileDrawerMenu } from './MobileDrawerMenu'

export function UserMobileMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (!user) return null

  const close = () => setOpen(false)

  const goTo = (path: string) => {
    close()
    navigate(path)
  }

  const handleLogout = () => {
    close()
    logout()
    navigate('/')
  }

  const itemClass =
    'block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50'

  return (
    <>
      <HamburgerButton
        open={open}
        onClick={() => setOpen((value) => !value)}
        label="Open account menu"
      />
      <MobileDrawerMenu open={open} onClose={close}>
        <div className="space-y-1">
          <div className="mb-3 rounded-2xl bg-zinc-50 px-4 py-4">
            <p className="truncate text-base font-bold text-zinc-900">{user.username}</p>
            <p className="mt-1 break-all text-xs text-zinc-500">{user.email}</p>
          </div>

          <button type="button" onClick={() => goTo('/profile')} className={itemClass}>
            Account
          </button>

          {user.role === 'admin' && (
            <button type="button" onClick={() => goTo('/admin-dashboard')} className={itemClass}>
              Admin dashboard
            </button>
          )}

          {user.role === 'customer' && (
            <button type="button" onClick={() => goTo('/customer/addresses')} className={itemClass}>
              My addresses
            </button>
          )}

          <Button
            type="button"
            variant="danger"
            onClick={handleLogout}
            className="mt-3 w-full !rounded-xl !py-3 text-sm font-bold"
          >
            Log out
          </Button>
        </div>
      </MobileDrawerMenu>
    </>
  )
}
