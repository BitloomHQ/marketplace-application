import { useEffect, useState, type FormEvent } from 'react'
import {
  deleteProfileImage,
  fetchAccountProfile,
  fetchProfileCompletion,
  updateAccountProfile,
  uploadProfileImage,
} from '../api/accounts'
import { ApiRequestError } from '../api/client'
import { accountProfileToUser } from '../lib/profile'
import { Alert, Button, Card, Field, Input, PageHeader, Textarea } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { isProviderRole } from '../lib/format'

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [bio, setBio] = useState('')
  const [experienceYears, setExperienceYears] = useState('')
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [completion, setCompletion] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isProvider = user ? isProviderRole(user.role) : false

  useEffect(() => {
    setError('')
    Promise.all([fetchAccountProfile(), fetchProfileCompletion().catch(() => null)])
      .then(([profileRes, completionRes]) => {
        const profile = profileRes.data.profile
        setFirstName(profile.first_name)
        setLastName(profile.last_name)
        setEmail(profile.email)
        setPhone(profile.phone ?? '')
        setAddress(profile.address ?? '')
        setBio(profile.bio ?? '')
        setExperienceYears(
          profile.experience_years != null ? String(profile.experience_years) : '',
        )
        setPreviewUrl(profile.profile_picture_url ?? profile.profile_picture)
        setCompletion(profileRes.data.profile_completion)
        if (completionRes) setCompletion(completionRes.data.percentage)
        setUser(accountProfileToUser(profile))
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
      if (profilePicture) {
        const imageRes = await uploadProfileImage(profilePicture)
        setPreviewUrl(imageRes.data.profile_picture)
        setCompletion(imageRes.data.profile_completion)
        setProfilePicture(null)
      }

      const res = await updateAccountProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
        address,
        bio: isProvider ? bio : undefined,
        experience_years:
          isProvider && experienceYears ? Number(experienceYears) : isProvider ? null : undefined,
      })
      setUser(accountProfileToUser(res.data.profile))
      setCompletion(res.data.profile_completion)
      setSuccess(res.message)
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const data = err.data as { errors?: Record<string, string[]> }
        if (data?.errors) {
          setError(
            Object.entries(data.errors)
              .map(([key, value]) => `${key}: ${value.join(', ')}`)
              .join('; '),
          )
        } else setError(err.message)
      } else setError('Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteImage = async () => {
    setError('')
    setSaving(true)
    try {
      const res = await deleteProfileImage()
      setPreviewUrl(null)
      setCompletion(res.data.profile_completion)
      setSuccess(res.message)
      if (user) setUser({ ...user, profile_picture: null })
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Delete failed')
    } finally {
      setSaving(false)
    }
  }

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
            {completion != null && (
              <p className="text-sm text-zinc-600">Profile completion: {completion}%</p>
            )}
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-400">
                  ?
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Field label="Profile picture">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setProfilePicture(e.target.files?.[0] ?? null)}
                  />
                </Field>
                {previewUrl && (
                  <Button type="button" onClick={handleDeleteImage} disabled={saving}>
                    Remove photo
                  </Button>
                )}
              </div>
            </div>
            {user?.is_verified && isProvider && (
              <p className="text-sm font-semibold text-emerald-700">Verified provider</p>
            )}
            <Field label="First name">
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </Field>
            <Field label="Last name">
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </Field>
            <Field label="Email">
              <Input type="email" value={email} disabled />
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
                    max={60}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                  />
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
