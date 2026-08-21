import { Select } from '../ui'

type ActiveStatusProps = {
  value: boolean
  disabled?: boolean
  onChange: (active: boolean) => void
}

export function AdminActiveStatusSelect({ value, disabled, onChange }: ActiveStatusProps) {
  return (
    <Select
      value={value ? 'active' : 'inactive'}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === 'active')}
      className="min-w-[7.5rem] text-sm"
    >
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
    </Select>
  )
}

type ProviderStatusProps = {
  isActive: boolean
  isVerified: boolean
  isApproved: boolean
  disabled?: boolean
  onActiveChange: (active: boolean) => void
  onVerifiedChange: (verified: boolean) => void
}

export function AdminProviderStatusFields({
  isActive,
  isVerified,
  isApproved,
  disabled,
  onActiveChange,
  onVerifiedChange,
}: ProviderStatusProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Account status</p>
        {!isApproved ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Pending approval — approve on Pending providers page first.
          </p>
        ) : (
          <AdminActiveStatusSelect value={isActive} disabled={disabled} onChange={onActiveChange} />
        )}
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">Verification</p>
        {!isApproved ? (
          <p className="text-sm text-zinc-500">Available after approval</p>
        ) : (
          <Select
            value={isVerified ? 'verified' : 'unverified'}
            disabled={disabled}
            onChange={(e) => onVerifiedChange(e.target.value === 'verified')}
            className="w-full text-sm"
          >
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </Select>
        )}
      </div>
    </div>
  )
}
