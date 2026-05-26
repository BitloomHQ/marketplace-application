import { Link } from 'react-router-dom'

type Portal = 'customer' | 'provider'

export function AuthPortalLinks({ portal }: { portal: Portal }) {
  const registerPath = portal === 'customer' ? '/customer/register' : '/provider/register'
  const otherLogin = portal === 'customer' ? '/provider/login' : '/customer/login'

  return (
    <div className="mt-6 space-y-3 border-t border-zinc-200 pt-4 text-center text-sm text-zinc-500">
      <p>
        No account?{' '}
        <Link to={registerPath} className="font-semibold text-violet-600 hover:text-violet-700">
          Sign up
        </Link>
      </p>
      <p>
        {portal === 'customer' ? 'Are you a pro?' : 'Need a service?'}{' '}
        <Link to={otherLogin} className="font-semibold text-violet-600 hover:text-violet-700">
          Switch here
        </Link>
      </p>
      <p>
        <Link to="/" className="text-zinc-400 hover:text-zinc-600">
          ← Home
        </Link>
      </p>
    </div>
  )
}
