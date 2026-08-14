import { Link } from 'react-router-dom'
import { Button } from './ui'
import logo from '/logo.png'

type Props = {
  onLoginClick?: () => void
}

export function GuestHeader({ onLoginClick }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:py-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={logo} alt="HomeServices" className="h-10 w-10" />
          <span className="text-base font-bold tracking-tight text-zinc-900 sm:text-lg">
            Home<span className="text-violet-600">Services</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
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
      </div>
    </header>
  )
}
