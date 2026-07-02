import { DEFAULT_SERVICE_IMAGE } from '../lib/defaultServiceImage'
import { resolveMediaUrl } from '../lib/media'
import type { ServiceCategory } from '../types'
import { Modal } from './ui'

type Props = {
  service: ServiceCategory | null
  open: boolean
  onClose: () => void
}

export function ComingSoonServiceModal({ service, open, onClose }: Props) {
  if (!service) return null

  const imageSrc = service.service_image
    ? resolveMediaUrl(service.service_image) ?? DEFAULT_SERVICE_IMAGE
    : DEFAULT_SERVICE_IMAGE

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={service.name}
      subtitle="This service is coming soon to your area"
    >
      <div className="space-y-4">
        <div className="mx-auto h-32 w-32 overflow-hidden rounded-full ring-4 ring-zinc-100">
          <img src={imageSrc} alt={service.name} className="h-full w-full object-cover" />
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <p className="text-sm font-semibold text-amber-900">Coming soon</p>
          {service.start_date && (
            <p className="mt-1 text-xs text-amber-800">Expected: {service.start_date}</p>
          )}
        </div>
        <p className="text-sm leading-relaxed text-zinc-600">{service.description}</p>
        <p className="text-xs text-zinc-500">
          We will notify you when {service.name.toLowerCase()} bookings open. Check back soon.
        </p>
      </div>
    </Modal>
  )
}
