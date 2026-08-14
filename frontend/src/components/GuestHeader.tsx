import { Link } from 'react-router-dom'
import { AppBrand } from './AppBrand'
import { GuestMobileMenu } from './GuestMobileMenu'
import { Button } from './ui'

type Props = {
  onLoginClick?: () => void
}

export function GuestHeader({ onLoginClick }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
        <div className="min-w-0 flex-1">
          <AppBrand />
        </div>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <Link
            to="/partner"
            className="rounded-full px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            Become a partner
          </Link>
          {onLoginClick ? (
            <Button
              type="button"
              onClick={onLoginClick}
              className="!rounded-full !bg-sky-600 !px-5 !py-2.5 text-sm font-bold hover:!bg-sky-700"
            >
              Login
            </Button>
          ) : (
            <Link to="/?login=1">
              <Button className="!rounded-full !bg-sky-600 !px-5 !py-2.5 text-sm font-bold hover:!bg-sky-700">
                Login
              </Button>
            </Link>
          )}
        </div>

        <div className="shrink-0 lg:hidden">
          <GuestMobileMenu onLoginClick={onLoginClick} />
        </div>
      </div>
    </header>
  )
}
