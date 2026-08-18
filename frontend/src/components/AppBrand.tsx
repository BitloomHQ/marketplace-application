import { Link } from 'react-router-dom'
import logo from '/logo.png'

type Props = {
  to?: string
}

export function AppBrand({ to = '/' }: Props) {
  return (
    <Link to={to} className="flex min-w-0 items-center gap-2">
      <img src={logo} alt="HomeServices" className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
      <span className="truncate text-sm font-bold tracking-tight text-zinc-900 sm:text-lg">
        Zep<span className="text-violet-600">Serve</span>
      </span>
    </Link>
  )
}
