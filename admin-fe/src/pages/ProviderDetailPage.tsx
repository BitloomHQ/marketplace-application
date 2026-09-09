import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchAdminProviderDetail, type AdminProviderDetail } from '../api/admin'
import { ApiRequestError } from '../api/client'
import { AdminProviderEditModal } from '../components/AdminProviderEditModal'
import { AdminDetailPageSkeleton } from '../components/Shimmer'
import { Alert, Badge, Button, Card } from '../components/ui'
import { formatService } from '../lib/format'

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(value: number | undefined | null) {
  const amount = Number(value ?? 0)
  if (!Number.isFinite(amount)) return '₹0'
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function humanizeKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function StatGrid({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data)
  if (entries.length === 0) return <p className="text-sm text-zinc-500">No data.</p>
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
          <p className="text-xs text-zinc-500">{humanizeKey(key)}</p>
          <p className="text-lg font-bold text-zinc-900">{value}</p>
        </div>
      ))}
    </div>
  )
}

function RecentItem({ item, fields }: { item: Record<string, unknown>; fields: string[] }) {
  const recognized = fields.filter((f) => item[f] != null)
  if (recognized.length === 0) {
    return (
      <pre className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600">
        {JSON.stringify(item, null, 2)}
      </pre>
    )
  }
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-700">
        {recognized.map((f) => (
          <span key={f}>
            <span className="text-zinc-400">{humanizeKey(f)}:</span> {String(item[f])}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ProviderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const providerId = Number(id)
  const [detail, setDetail] = useState<AdminProviderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  const load = () => {
    setLoading(true)
    setError('')
    fetchAdminProviderDetail(providerId)
      .then((res) => setDetail(res.data))
      .catch((err) => setError(err instanceof ApiRequestError ? err.message : 'Failed to load provider'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (Number.isFinite(providerId)) load()
  }, [providerId])

  return (
    <div className="space-y-6">
      <Link to="/providers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700">
        ← Back to providers
      </Link>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <AdminDetailPageSkeleton />
      ) : detail ? (
        <>
          {(() => {
            const { provider, account_status, operational_status, location, availability, performance, recent_bookings, recent_reviews } = detail
            return (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 text-xl font-bold text-violet-700">
                      {provider.profile_picture ? (
                        <img src={provider.profile_picture} alt="" className="h-full w-full object-cover" />
                      ) : (
                        (provider.full_name || provider.username).charAt(0).toUpperCase()
                      )}
                    </span>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                        {provider.full_name || provider.username}
                      </h1>
                      <p className="mt-1 text-sm text-zinc-500">
                        {provider.email} · {formatService(provider.role)}
                      </p>
                      {provider.phone && <p className="text-sm text-zinc-500">{provider.phone}</p>}
                    </div>
                  </div>
                  <Button onClick={() => setEditOpen(true)}>Edit</Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge tone={account_status.is_active ? 'success' : 'danger'}>
                    {account_status.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge tone={account_status.is_approved ? 'success' : 'warning'}>
                    {account_status.is_approved ? 'Approved' : 'Pending approval'}
                  </Badge>
                  {account_status.is_verified && <Badge tone="success">Verified</Badge>}
                  <Badge tone={operational_status.is_online ? 'success' : 'neutral'}>
                    {operational_status.is_online ? 'Online' : 'Offline'}
                  </Badge>
                  <Badge tone={operational_status.is_busy ? 'warning' : 'neutral'}>
                    {operational_status.is_busy ? 'Busy' : 'Available'}
                  </Badge>
                  {operational_status.marketplace_ready && <Badge tone="success">Marketplace ready</Badge>}
                </div>

                {!account_status.is_active && account_status.deactivate_reason && (
                  <Alert variant="error">
                    <span className="font-semibold">Deactivation reason:</span> {account_status.deactivate_reason}
                  </Alert>
                )}

                <Card>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">Location</h3>
                  {location.has_location ? (
                    <div className="space-y-2 text-sm text-zinc-700">
                      <p>
                        {location.latitude?.toFixed(5)}, {location.longitude?.toFixed(5)}
                        {location.location_text ? ` · ${location.location_text}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone="neutral">{location.location_source === 'live' ? 'Live' : 'Manual'}</Badge>
                        {location.live_location_is_fresh && <Badge tone="success">Fresh</Badge>}
                        {location.live_location_is_stale && <Badge tone="warning">Stale</Badge>}
                      </div>
                      <p className="text-zinc-500">
                        {location.service_radius_km ?? '—'} km preferred · {location.effective_radius_km ?? '—'} km effective ·{' '}
                        {location.admin_max_radius_km ?? '—'} km admin max
                      </p>
                      <p className="text-xs text-zinc-400">Updated {formatDateTime(location.last_location_updated_at)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">Not set</p>
                  )}
                </Card>

                <Card>
                  <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-zinc-500">Weekly availability</h3>
                  <p className="mb-3 text-xs text-zinc-500">
                    {availability.active_slots} of {availability.total_slots} slots active ·{' '}
                    {availability.has_availability ? 'Has availability' : 'No availability'}
                  </p>
                  <div className="space-y-2">
                    {DAY_ORDER.map((day) => {
                      const slots = availability.weekly_schedule?.[day] ?? []
                      return (
                        <div key={day} className="flex flex-wrap items-center gap-2 border-b border-zinc-100 pb-2 last:border-0">
                          <span className="w-24 shrink-0 text-sm font-semibold text-zinc-700">{capitalize(day)}</span>
                          {slots.length === 0 ? (
                            <span className="text-sm text-zinc-400">No slots</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {slots.map((slot, i) => (
                                <Badge key={i} tone={slot.is_available ? 'success' : 'neutral'}>
                                  {slot.start_time}–{slot.end_time}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </Card>

                <Card>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">Performance</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold text-zinc-500">Quotes</p>
                      <StatGrid data={performance.quotes} />
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-semibold text-zinc-500">Bookings</p>
                      <StatGrid data={performance.bookings} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                        <p className="text-xs text-zinc-500">Booking value</p>
                        <p className="text-lg font-bold text-zinc-900">{formatMoney(performance.booking_value.total)}</p>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                        <p className="text-xs text-zinc-500">Completed value</p>
                        <p className="text-lg font-bold text-zinc-900">{formatMoney(performance.booking_value.completed)}</p>
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
                        <p className="text-xs text-zinc-500">Avg. value</p>
                        <p className="text-lg font-bold text-zinc-900">{formatMoney(performance.booking_value.average)}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
                      <span className="font-bold text-amber-600">{performance.reviews.average_rating || '—'}</span> average rating ·{' '}
                      {performance.reviews.total} reviews
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">Recent bookings</h3>
                  {recent_bookings.length === 0 ? (
                    <p className="text-sm text-zinc-500">No recent bookings.</p>
                  ) : (
                    <div className="space-y-2">
                      {recent_bookings.map((booking, i) => (
                        <RecentItem
                          key={i}
                          item={booking}
                          fields={['id', 'status', 'service_type', 'customer', 'final_price', 'created_at']}
                        />
                      ))}
                    </div>
                  )}
                </Card>

                <Card>
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-zinc-500">Recent reviews</h3>
                  {recent_reviews.length === 0 ? (
                    <p className="text-sm text-zinc-500">No recent reviews.</p>
                  ) : (
                    <div className="space-y-2">
                      {recent_reviews.map((review, i) => (
                        <RecentItem
                          key={i}
                          item={review}
                          fields={['rating', 'customer', 'comment', 'review', 'created_at']}
                        />
                      ))}
                    </div>
                  )}
                </Card>

                <Card>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-zinc-500">Registered address</h3>
                  <p className="text-sm text-zinc-700">{provider.address?.trim() || 'Not provided'}</p>
                  {provider.bio && (
                    <>
                      <h3 className="mb-2 mt-4 text-sm font-bold uppercase tracking-wide text-zinc-500">Bio</h3>
                      <p className="text-sm text-zinc-700">{provider.bio}</p>
                    </>
                  )}
                  {provider.experience_years != null && (
                    <p className="mt-2 text-sm text-zinc-500">{provider.experience_years} years experience</p>
                  )}
                </Card>

                <AdminProviderEditModal
                  provider={provider}
                  open={editOpen}
                  onClose={() => setEditOpen(false)}
                  onUpdated={load}
                />
              </>
            )
          })()}
        </>
      ) : (
        !error && <Card><p className="text-sm text-zinc-500">Provider not found.</p></Card>
      )}
    </div>
  )
}
