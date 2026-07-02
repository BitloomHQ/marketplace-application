import { Modal } from './ui'
import { ProviderAvatar } from './ProviderAvatar'
import { StarRating } from './StarRating'
import type { ProviderProfile } from '../types'

type Props = {
  profile: ProviderProfile | null
  open: boolean
  onClose: () => void
}

export function ProviderProfileModal({ profile, open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={profile?.provider ?? 'Professional'}>
      {profile && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ProviderAvatar
              name={profile.provider}
              imageUrl={profile.provider_profile_picture}
              size="lg"
            />
            <div>
              <p className="text-lg font-bold text-zinc-900">{profile.provider}</p>
              <StarRating
                rating={profile.average_rating}
                totalReviews={profile.total_reviews}
              />
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm leading-relaxed text-zinc-600">{profile.bio}</p>
          )}

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
