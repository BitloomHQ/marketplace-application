import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from './ui'
import { HamburgerButton, MobileDrawerMenu } from './MobileDrawerMenu'

type Props = {
  onLoginClick?: () => void
}

export function GuestMobileMenu({ onLoginClick }: Props) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  const handleLogin = () => {
    close()
    if (onLoginClick) {
      onLoginClick()
      return
    }
    navigate('/?login=1')
  }

  return (
    <>
      <HamburgerButton open={open} onClick={() => setOpen((value) => !value)} label="Open menu" />
      <MobileDrawerMenu open={open} onClose={close}>
        <div className="space-y-1">
          <Link
            to="/partner"
            onClick={close}
            className="block w-full rounded-xl px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
          >
            Become a partner
          </Link>
          <Button
            type="button"
            onClick={handleLogin}
            className="mt-2 w-full !rounded-xl !bg-sky-600 !py-3 text-sm font-bold hover:!bg-sky-700"
          >
            Login
          </Button>
        </div>
      </MobileDrawerMenu>
    </>
  )
}
