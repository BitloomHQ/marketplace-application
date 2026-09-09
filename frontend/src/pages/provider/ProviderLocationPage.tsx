import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchProviderLocation, updateProviderLocation, type ProviderLocationData } from '../../api/providers'
import { ApiRequestError } from '../../api/client'
import { AddressLocationPicker } from '../../components/AddressLocationPicker'
import { useAuth } from '../../context/AuthContext'
import { providerDeactivationReason } from '../../lib/providerStatus'
import { Alert, Card, PageHeader, Switch } from '../../components/ui'
import { Shimmer } from '../../components/Shimmer'

const LIVE_REFRESH_INTERVAL_MS = 60_000

function timeAgo(value: string | null): string {
  if (!value) return 'Never'
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hr${hours !== 1 ? 's' : ''} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days !== 1 ? 's' : ''} ago`
}

function StatusPill({ tone, children }: { tone: 'success' | 'neutral' | 'warning'; children: React.ReactNode }) {
  const styles = {
    success: 'bg-emerald-100 text-emerald-800',
    neutral: 'bg-zinc-100 text-zinc-700',
    warning: 'bg-amber-100 text-amber-800',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${styles[tone]}`}>
      {children}
    </span>
  )
}

function getGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Your browser does not support GPS location.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 30_000,
    })
  })
}

export function ProviderLocationPage() {
  const { user } = useAuth()
  const pendingApproval = user?.is_approved === false
  const deactivated = user?.is_active === false
  const deactivationReason = providerDeactivationReason(user)
  const canManage = !pendingApproval && !deactivated

  const [data, setData] = useState<ProviderLocationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [togglingOnline, setTogglingOnline] = useState(false)
  const [locatingLive, setLocatingLive] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)
  const [savingRadius, setSavingRadius] = useState(false)

  const [mode, setMode] = useState<'live' | 'manual'>('manual')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | null>(null)
  const [lon, setLon] = useState<number | null>(null)
  const [radius, setRadius] = useState(10)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetchProviderLocation()
      .then((res) => {
        setData(res.data)
        setMode(res.data.location_source === 'live' ? 'live' : 'manual')
        setAddress(res.data.location_text ?? '')
        setLat(res.data.latitude)
        setLon(res.data.longitude)
        setRadius(res.data.service_radius_km)
      })
      .catch((err) => {
        if (err instanceof ApiRequestError && err.status === 404) {
          setError('Create your provider profile first, then set up your marketplace location.')
        } else {
          setError(err instanceof ApiRequestError ? err.message : 'Failed to load location settings')
        }
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!canManage) {
      setLoading(false)
      return
    }
    load()
  }, [canManage, load])

  const applyResult = (res: { data: ProviderLocationData }, message: string) => {
    setData(res.data)
    setNotice(message)
    setError('')
    window.setTimeout(() => setNotice(''), 4000)
  }

  const handleToggleOnline = async () => {
    if (!data) return
    setTogglingOnline(true)
    setError('')
    try {
      const res = await updateProviderLocation({ is_online: !data.is_online })
      applyResult(res, !data.is_online ? "You're online and visible to nearby customers." : "You're now offline.")
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update status')
    } finally {
      setTogglingOnline(false)
    }
  }

  const handleUseLiveLocation = async (silent = false) => {
    if (!silent) {
      setLocatingLive(true)
      setError('')
    }
    try {
      const pos = await getGeolocation()
      const res = await updateProviderLocation({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        location_source: 'live',
      })
      setLat(res.data.latitude)
      setLon(res.data.longitude)
      if (!silent) applyResult(res, 'Live location updated.')
      else setData(res.data)
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof ApiRequestError
            ? err.message
            : 'Could not read your device location. Check location permissions.',
        )
      }
    } finally {
      if (!silent) setLocatingLive(false)
    }
  }

  // Periodically refresh live coordinates while online in live mode.
  const liveRefreshRef = useRef(handleUseLiveLocation)
  useEffect(() => {
    liveRefreshRef.current = handleUseLiveLocation
  })
  useEffect(() => {
    if (!data?.is_online || mode !== 'live') return
    const interval = window.setInterval(() => liveRefreshRef.current(true), LIVE_REFRESH_INTERVAL_MS)
    return () => window.clearInterval(interval)
  }, [data?.is_online, mode])

  const handleSaveManualLocation = async () => {
    if (lat == null || lon == null) {
      setError('Pick a location on the map first.')
      return
    }
    setSavingLocation(true)
    setError('')
    try {
      const res = await updateProviderLocation({
        latitude: lat,
        longitude: lon,
        location_source: 'manual',
        location_text: address,
      })
      setMode('manual')
      applyResult(res, 'Location saved.')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to save location')
    } finally {
      setSavingLocation(false)
    }
  }

  const handleSaveRadius = async () => {
    setSavingRadius(true)
    setError('')
    try {
      const res = await updateProviderLocation({ service_radius_km: radius })
      applyResult(res, 'Service radius updated.')
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to update radius')
    } finally {
      setSavingRadius(false)
    }
  }

  if (!canManage) {
    return (
      <div>
        <PageHeader title="Marketplace location" />
        {pendingApproval && (
          <Alert variant="info">
            Your provider account is pending admin approval. You can set your location once an admin
            verifies your account.
          </Alert>
        )}
        {deactivated && (
          <Alert variant="error">
            Your provider account is deactivated{deactivationReason ? `: ${deactivationReason}` : '.'}
          </Alert>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace location"
        subtitle="Control where and when customers can find you nearby."
      />

      {error && <Alert variant="error">{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      {loading || !data ? (
        <div className="space-y-4">
          <Shimmer className="h-32 w-full rounded-2xl" />
          <Shimmer className="h-72 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Status hero */}
          <div
            className={`rounded-2xl border p-6 shadow-sm transition ${
              data.is_online
                ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
                : 'border-zinc-200 bg-gradient-to-br from-zinc-50 to-white'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span
                  className={`relative flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
                    data.is_online ? 'bg-emerald-100' : 'bg-zinc-200'
                  }`}
                >
                  {data.is_online && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-30" />
                  )}
                  <span className="relative">{data.is_online ? '🟢' : '⚪️'}</span>
                </span>
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">
                    {data.is_online ? "You're online" : "You're offline"}
                  </h2>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {data.is_online
                      ? 'Visible to nearby customers within your service radius.'
                      : 'Turn online to start receiving nearby job leads.'}
                  </p>
                </div>
              </div>
              <Switch checked={data.is_online} onChange={handleToggleOnline} disabled={togglingOnline} label="Online status" />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {!data.is_location_matching_enabled && (
                <StatusPill tone="warning">⚠️ Marketplace matching disabled by admin</StatusPill>
              )}
              {!data.is_available && <StatusPill tone="warning">Marked unavailable</StatusPill>}
              <StatusPill tone="neutral">📍 Radius: {data.effective_radius_km} km effective</StatusPill>
              <StatusPill tone="neutral">🕒 Updated {timeAgo(data.last_location_updated_at)}</StatusPill>
              {data.location_source && (
                <StatusPill tone={data.location_source === 'live' ? 'success' : 'neutral'}>
                  {data.location_source === 'live' ? '📡 Live GPS' : '🗺️ Manual location'}
                </StatusPill>
              )}
            </div>
          </div>

          {/* Location mode */}
          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">Working location</h3>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Live GPS updates automatically while you're online. Manual location stays fixed until
                  you change it.
                </p>
              </div>
            </div>

            <div className="mb-4 flex gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
              <button
                type="button"
                onClick={() => setMode('live')}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === 'live' ? 'bg-white text-violet-700 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Live GPS
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === 'manual' ? 'bg-white text-violet-700 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Choose manually
              </button>
            </div>

            {mode === 'live' ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
                  {lat != null && lon != null ? (
                    <p className="text-sm text-zinc-700">
                      Current GPS fix: <span className="font-semibold">{lat.toFixed(5)}, {lon.toFixed(5)}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-zinc-500">No live location captured yet.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleUseLiveLocation(false)}
                  disabled={locatingLive}
                  className="w-full rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-zinc-900/10 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {locatingLive ? 'Locating…' : '📍 Use my current location'}
                </button>
                {data.is_online && (
                  <p className="text-center text-xs text-zinc-400">
                    Refreshes automatically every minute while you're online.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <AddressLocationPicker
                  variant="map-only"
                  address={address}
                  lat={lat}
                  lon={lon}
                  onAddressChange={setAddress}
                  onLocationChange={(nextLat, nextLon) => {
                    setLat(nextLat)
                    setLon(nextLon)
                  }}
                  disabled={savingLocation}
                />
                <button
                  type="button"
                  onClick={handleSaveManualLocation}
                  disabled={savingLocation || lat == null || lon == null}
                  className="w-full rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-zinc-900/10 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingLocation ? 'Saving…' : 'Save location'}
                </button>
              </div>
            )}
          </Card>

          {/* Service radius */}
          <Card>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-900">Service radius</h3>
              <span className="text-lg font-bold text-violet-700">{radius} km</span>
            </div>
            <p className="mb-4 text-sm text-zinc-500">
              Capped at {data.admin_max_radius_km} km by the marketplace admin. Effective radius used for
              matching is the smaller of your preference and the admin limit.
            </p>
            <input
              type="range"
              min={1}
              max={data.admin_max_radius_km}
              value={Math.min(radius, data.admin_max_radius_km)}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-zinc-200 accent-violet-600"
            />
            <div className="mt-1 flex justify-between text-xs text-zinc-400">
              <span>1 km</span>
              <span>{data.admin_max_radius_km} km max</span>
            </div>
            <button
              type="button"
              onClick={handleSaveRadius}
              disabled={savingRadius || radius === data.service_radius_km}
              className="mt-4 w-full rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-600/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingRadius ? 'Saving…' : 'Save radius'}
            </button>
          </Card>
        </>
      )}
    </div>
  )
}
