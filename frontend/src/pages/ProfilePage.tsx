import { useEffect, useRef, useState, type FormEvent } from 'react'
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
import { ProfileFormSkeleton } from '../components/Shimmer'
import { useAuth } from '../context/AuthContext'
import { isProviderRole } from '../lib/format'

function CameraIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function CompletionRing({ percentage }: { percentage: number }) {
  const radius = 22
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference
  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-zinc-100" />
        <circle
          cx="26"
          cy="26"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-sky-600 transition-all duration-500"
        />
      </svg>
      <span className="absolute text-xs font-bold text-zinc-900">{percentage}%</span>
    </div>
  )
}

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
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
        const profileUser = accountProfileToUser(profile)
        setUser(profileUser)
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
        subtitle="Your details & contact info"
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
      <Card className="max-w-3xl !p-0 overflow-hidden">
        {loading ? (
          <div className="p-5">
            <ProfileFormSkeleton />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="lg:grid lg:grid-cols-[15rem_1fr]">
            <div className="border-b border-zinc-100 bg-zinc-50/60 p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-4 lg:flex-col lg:items-start lg:gap-3">
                <div className="relative shrink-0">
                  {previewUrl ? (
                    <img src={previewUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-4 ring-white" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-100 text-2xl font-bold text-sky-700 ring-4 ring-white">
                      {(firstName || user?.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-sky-600 text-white shadow-md transition hover:bg-sky-700"
                    aria-label="Change profile photo"
                  >
                    <CameraIcon />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => setProfilePicture(e.target.files?.[0] ?? null)}
                  />
                </div>

                <div className="min-w-0 lg:mt-1">
                  <p className="font-bold text-zinc-900">
                    {firstName || lastName ? `${firstName} ${lastName}`.trim() : user?.username}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{email}</p>
                  {user?.is_verified && isProvider && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      Verified provider
                    </span>
                  )}
                </div>
              </div>

              {profilePicture && (
                <p className="mt-3 text-xs text-sky-700">New photo selected — save to apply.</p>
              )}
              {previewUrl && (
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  disabled={saving}
                  className="mt-3 text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  Remove photo
                </button>
              )}

              {completion != null && (
                <div className="mt-6 flex items-center gap-3">
                  <CompletionRing percentage={completion} />
                  <div>
                    <p className="text-xs font-semibold text-zinc-900">Profile completion</p>
                    <p className="text-xs text-zinc-500">Keep it 100% for the best matches</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5 p-6">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Personal details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </Field>
                  <Field label="Last name">
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={email} disabled className="bg-zinc-50 text-zinc-500" />
                  </Field>
                  <Field label="Phone">
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Address</p>
                <Field label="Address">
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>
              </div>

              {isProvider && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                    Professional details
                  </p>
                  <div className="space-y-4">
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
                        className="max-w-[10rem]"
                      />
                    </Field>
                  </div>
                </div>
              )}

              <div className="border-t border-zinc-100 pt-5">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
