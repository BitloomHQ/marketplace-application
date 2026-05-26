import { Modal } from './ui'
import type { ProviderProfile } from '../types'

type Props = {
  profile: ProviderProfile | null
  open: boolean
  onClose: () => void
}

function formatRating(profile: ProviderProfile): string {
  if (profile.total_reviews === 0) return 'No reviews yet'
  return `${profile.average_rating} ★`
}

export function ProviderProfileModal({ profile, open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={profile?.provider ?? 'Professional'}>
      {profile && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-xl font-bold text-violet-700">
              {profile.provider.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="text-lg font-bold text-zinc-900">{profile.provider}</p>
              <p className="text-sm font-medium text-amber-700">{formatRating(profile)}</p>
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            {profile.provider_phone && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Phone</dt>
                <dd className="mt-0.5">
                  <a href={`tel:${profile.provider_phone}`} className="font-medium text-violet-600">
                    {profile.provider_phone}
                  </a>
                </dd>
              </div>
            )}
            {profile.provider_email && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Email</dt>
                <dd className="mt-0.5">
                  <a href={`mailto:${profile.provider_email}`} className="font-medium text-violet-600">
                    {profile.provider_email}
                  </a>
                </dd>
              </div>
            )}
            {profile.provider_address && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">Address</dt>
                <dd className="mt-0.5 text-zinc-700">{profile.provider_address}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </Modal>
  )
}
