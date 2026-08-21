import type { AdminPermissions } from '../../api/admin'

const PERMISSION_FIELDS: { key: keyof AdminPermissions; label: string }[] = [
  { key: 'manage_providers', label: 'Manage providers' },
  { key: 'manage_customers', label: 'Manage customers' },
  { key: 'manage_services', label: 'Manage services' },
  { key: 'manage_bookings', label: 'Manage bookings' },
  { key: 'manage_quotes', label: 'Manage quotes' },
  { key: 'view_reports', label: 'View reports' },
  { key: 'manage_spotlights', label: 'Manage spotlights' },
  { key: 'manage_admin_users', label: 'Manage admin users' },
]

type Props = {
  value: AdminPermissions
  onChange: (next: AdminPermissions) => void
  disabled?: boolean
}

export function AdminPermissionsFields({ value, onChange, disabled }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PERMISSION_FIELDS.map(({ key, label }) => (
        <label
          key={key}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700"
        >
          <input
            type="checkbox"
            checked={value[key]}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
            className="h-4 w-4 rounded border-zinc-300 text-violet-600"
          />
          {label}
        </label>
      ))}
    </div>
  )
}

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  manage_providers: false,
  manage_customers: false,
  manage_services: false,
  manage_bookings: false,
  manage_quotes: false,
  view_reports: false,
  manage_spotlights: false,
  manage_admin_users: false,
}
