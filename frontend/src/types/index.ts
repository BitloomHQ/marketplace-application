export type UserRole = 'customer' | 'gardener' | 'electrician' | 'plumber' | 'admin'

export type ServiceType = 'gardener' | 'electrician' | 'plumber'

export type BookingStatus = 'assigned' | 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type ProviderRole = 'gardener' | 'electrician' | 'plumber'

export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  phone: string
  address?: string
}

export interface CustomerAddress {
  id: number
  title: string
  address: string
  lat: number | null
  lon: number | null
}

export type PolygonPoint = { lat: number; lon: number }

export interface LoginResponse {
  success: boolean
  message: string
  token: string
  user: User
  redirect_url: string
}

export interface Lead {
  id: number
  customer: string
  address: string
  lat: number | null
  lon: number | null
  area: number | null
  lawn_area?: number | null
  polygon_points?: PolygonPoint[] | null
  description: string | null
  image: string | null
  status: string
  has_quoted: boolean
}

export interface Quote {
  id: number
  provider: string
  provider_id: number
  provider_email: string
  provider_phone: string | null
  provider_address: string | null
  average_rating: number
  total_reviews: number
  price: number
  message: string | null
  status: string
}

export interface Booking {
  id: number
  service_type: ServiceType
  customer: string
  provider: string
  provider_id?: number
  address?: string
  lat?: number | null
  lon?: number | null
  lawn_area?: number | null
  polygon_points?: PolygonPoint[] | null
  final_price: number
  status: BookingStatus
  created_at: string
  has_review?: boolean
}

export interface ProviderProfile {
  provider_id: number
  provider: string
  provider_email: string
  provider_phone: string | null
  provider_address: string | null
  average_rating: number
  total_reviews: number
}

export interface ApiError {
  success: false
  message?: string
  errors?: Record<string, string[]>
}
