import { Link } from 'react-router-dom'
import { AuthOrDivider } from './auth/AuthOrDivider'

type Portal = 'customer' | 'provider'

export function AuthPortalLinks({ portal }: { portal: Portal }) {
  const registerPath = portal === 'customer' ? '/customer/register' : '/provider/register'
  const otherLogin = portal === 'customer' ? '/provider/login' : '/customer/login'
  const switchLabel = portal === 'customer' ? 'Are you a PRO?' : 'Need a service?'
  const switchCta = portal === 'customer' ? 'Switch from here' : 'Switch from here'

  return (
    <div className="text-center text-sm text-zinc-500">
      <AuthOrDivider />
      <p>
        Don&apos;t have any account yet?{' '}
        <Link to={registerPath} className="font-semibold text-sky-600 hover:text-sky-700">
          Sign up
        </Link>
      </p>
      <div className="my-5 border-t border-dashed border-zinc-200" />
      <p>
        {switchLabel}{' '}
        <Link to={otherLogin} className="font-semibold text-sky-600 hover:text-sky-700">
          {switchCta}
        </Link>
      </p>
    </div>
  )
}
