import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isProviderRole, providerDashboardPath } from '../lib/format'

type Props = {
  children: React.ReactNode
  roles?: string[]
  providerOnly?: boolean
}

export function ProtectedRoute({ children, roles, providerOnly }: Props) {
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  if (!isAuthenticated || !user) {
    return <Navigate to="/" state={{ from: location }} replace />
  }

  if (providerOnly && !isProviderRole(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />
    if (user.role === 'customer') return <Navigate to="/customer-dashboard" replace />
    return <Navigate to="/" replace />
  }

  if (roles && !roles.includes(user.role) && !(providerOnly && isProviderRole(user.role))) {
    if (user.role === 'admin') return <Navigate to="/admin-dashboard" replace />
    if (user.role === 'customer') return <Navigate to="/customer-dashboard" replace />
    if (isProviderRole(user.role)) {
      return <Navigate to={providerDashboardPath(user.role)} replace />
    }
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
