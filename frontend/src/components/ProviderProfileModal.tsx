import { Modal } from './ui'
import { ProviderAvatar } from './ProviderAvatar'
import { StarRating } from './StarRating'
import { formatService } from '../lib/format'
import { resolveMediaUrl } from '../lib/media'
import type { ProviderProfile } from '../types'

type Props = {
  profile: ProviderProfile | null
  open: boolean
  onClose: () => void
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      ✅ Verified provider
    </span>
  )
}

export function ProviderProfileModal({ profile, open, onClose }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={profile?.provider ?? 'Professional'} wide>
      {profile && (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <ProviderAvatar
              name={profile.provider}
              imageUrl={profile.provider_profile_picture}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-bold text-zinc-900">{profile.provider}</p>
                {profile.is_verified && <VerifiedBadge />}
              </div>
              {profile.provider_role && (
                <p className="mt-0.5 text-sm text-zinc-500">
                  {formatService(profile.provider_role)}
                </p>
              )}
              <div className="mt-1">
                <StarRating
                  rating={profile.average_rating}
                  totalReviews={profile.total_reviews}
                />
              </div>
              {profile.experience_years != null && profile.experience_years > 0 && (
                <p className="mt-1 text-xs font-medium text-zinc-500">
                  {profile.experience_years} year{profile.experience_years !== 1 ? 's' : ''} experience
                </p>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="text-sm leading-relaxed text-zinc-600">{profile.bio}</p>
          )}

          {profile.portfolio_images && profile.portfolio_images.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                Previous work
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {profile.portfolio_images.map((item) => {
                  const src = resolveMediaUrl(item.image)
                  if (!src) return null
                  return (
                    <figure key={item.id} className="overflow-hidden rounded-xl ring-1 ring-zinc-200">
                      <img
                        src={src}
                        alt={item.caption || 'Portfolio'}
                        className="aspect-[4/3] w-full object-cover"
                        loading="lazy"
                      />
                      {item.caption && (
                        <figcaption className="px-2 py-1.5 text-xs text-zinc-600">
                          {item.caption}
                        </figcaption>
                      )}
                    </figure>
                  )
                })}
              </div>
            </div>
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
