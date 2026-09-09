import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { Badge, Button, Card, PageHeader } from '../components/ui'

export function AccountPage() {
  const { admin, logout } = useAdminAuth()
  const navigate = useNavigate()

  if (!admin) return null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div>
      <PageHeader title="Account" subtitle="Your admin account details" />
      <Card className="max-w-xl space-y-4">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xl font-bold text-violet-700">
            {admin.username.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-bold text-zinc-900">{admin.full_name || admin.username}</p>
            <p className="text-sm text-zinc-500">{admin.email}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge tone={admin.admin_type === 'super_admin' ? 'success' : 'neutral'}>
            {admin.admin_type === 'super_admin' ? 'Super admin' : 'Admin'}
          </Badge>
          {admin.is_superuser && <Badge tone="success">Superuser</Badge>}
        </div>

        <Button variant="danger" onClick={handleLogout}>
          Log out
        </Button>
      </Card>
    </div>
  )
}
