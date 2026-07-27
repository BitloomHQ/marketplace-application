import type { AccountProfile, User } from '../types'

export function accountProfileToUser(profile: AccountProfile): User {
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    role: profile.role,
    phone: profile.phone,
    address: profile.address,
    profile_picture: profile.profile_picture_url ?? profile.profile_picture,
    bio: profile.bio || null,
    experience_years: profile.experience_years,
    is_verified: profile.is_verified,
    is_email_verified: profile.is_email_verified,
    is_approved: profile.is_approved,
    is_active: profile.is_active,
    status_note: profile.status_note,
  }
}
