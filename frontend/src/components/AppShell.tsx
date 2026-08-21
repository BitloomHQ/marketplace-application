import { useAuth } from '../context/AuthContext'
import { AdminLayout } from './admin/AdminLayout'
import { Layout } from './Layout'

/** Picks admin sidebar shell vs standard app shell by role. */
export function AppShell() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role === 'admin') return <AdminLayout />
  return <Layout />
}
