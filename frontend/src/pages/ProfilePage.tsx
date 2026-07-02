import { useEffect, useState, type FormEvent } from 'react'
import { fetchActiveServices } from '../api/accounts'
import { fetchProfile, updateProfile } from '../api/services'
import { uploadImageFile } from '../api/uploads'
import { ApiRequestError } from '../api/client'
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { isProviderRole } from '../lib/format'
import type { ActiveService } from '../types'

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [bio, setBio] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [serviceType, setServiceType] = useState('plumber')
  const [serviceOptions, setServiceOptions] = useState<ActiveService[]>([])
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isProvider = user ? isProviderRole(user.role) : false

  useEffect(() => {
    setError('')
    Promise.all([
      fetchProfile(),
      isProvider ? fetchActiveServices().catch(() => ({ services: [] as ActiveService[] })) : null,
    ])
      .then(([profileRes, servicesRes]) => {
        setUsername(profileRes.user.username)
        setEmail(profileRes.user.email)
        setPhone(profileRes.user.phone ?? '')
        setAddress(profileRes.user.address ?? '')
        setBio(profileRes.user.bio ?? '')
        setExperienceYears(
          profileRes.user.experience_years != null ? String(profileRes.user.experience_years) : '',
        )
        setPreviewUrl(profileRes.user.profile_picture ?? null)
        if (isProviderRole(profileRes.user.role)) {
          setServiceType(profileRes.user.role)
        }
        if (servicesRes?.services?.length) {
          setServiceOptions(servicesRes.services)
        }
        setUser(profileRes.user)
      })
      .catch((err) =>
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load profile'),
      )
      .finally(() => setLoading(false))
  }, [setUser, isProvider])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      let profilePictureKey: string | undefined
      if (profilePicture) {
        profilePictureKey = (await uploadImageFile(profilePicture, 'profile_pictures')) ?? undefined
      }

      const res = await updateProfile({
        username,
        email,
        phone,
        address,
        bio,
        experience_years: experienceYears ? Number(experienceYears) : undefined,
        ...(isProvider ? { service_type: serviceType } : {}),
        ...(profilePictureKey
          ? { profile_picture_key: profilePictureKey }
          : { profile_picture: profilePicture }),
      })
      setUser(res.user)
      setPreviewUrl(res.user.profile_picture ?? previewUrl)
      setProfilePicture(null)
      setSuccess(res.message)
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const serviceSelectOptions =
    serviceOptions.length > 0
      ? serviceOptions
      : [{ id: 0, key: serviceType, name: serviceType, description: '', status: 'active' as const, service_image: null }]

  return (
    <div>
      <PageHeader
        title="Account"
        subtitle={user ? 'Your details & contact info' : 'Manage your account'}
      />
      {error && (
        <div className="mb-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert variant="success">{success}</Alert>
        </div>
      )}
      <Card className="max-w-xl">
        {loading ? (
          <p className="text-slate-400">Loading profile…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                  ?
                </div>
              )}
              <Field label="Profile picture">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfilePicture(e.target.files?.[0] ?? null)}
                />
              </Field>
            </div>
            {user?.is_verified && isProvider && (
              <p className="text-sm font-semibold text-emerald-700">✅ Verified provider</p>
            )}
            <Field label="Username">
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="Address">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            {isProvider && (
              <>
                <Field label="Bio">
                  <Textarea value={bio} onChange={(e) => setBio(e.target.value)} />
                </Field>
                <Field label="Experience (years)">
                  <Input
                    type="number"
                    min={0}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                  />
                </Field>
                <Field label="Service type">
                  <Select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value)}
                  >
                    {serviceSelectOptions.map((service) => (
                      <option key={service.key} value={service.key}>
                        {service.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
