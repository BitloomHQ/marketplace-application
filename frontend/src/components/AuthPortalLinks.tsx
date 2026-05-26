import { Link } from 'react-router-dom'

type Portal = 'customer' | 'provider'

export function AuthPortalLinks({ portal }: { portal: Portal }) {
  const registerPath = portal === 'customer' ? '/customer/register' : '/provider/register'
  const otherLogin = portal === 'customer' ? '/provider/login' : '/customer/login'
  const otherLabel = portal === 'customer' ? 'Provider' : 'Customer'

  return (
    <div className="mt-6 space-y-3 border-t border-slate-800 pt-4 text-center text-sm text-slate-400">
      <p>
        No account?{' '}
        <Link to={registerPath} className="text-violet-400 hover:text-violet-300">
          Register
        </Link>
      </p>
      <p>
        {otherLabel} account?{' '}
        <Link to={otherLogin} className="text-violet-400 hover:text-violet-300">
          {otherLabel} sign in
        </Link>
      </p>
      <p>
        <Link to="/" className="text-slate-500 hover:text-slate-300">
          ← Back to home
        </Link>
      </p>
    </div>
  )
}
