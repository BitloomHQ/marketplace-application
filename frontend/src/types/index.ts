export type UserRole = 'customer' | 'admin' | (string & {})

export type ServiceType = string

export type ServiceCategoryStatus = 'active' | 'inactive' | 'coming_soon'

export type BookingStatus = 'assigned' | 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type ProviderRole = string

export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  phone: string
  address?: string
  profile_picture?: string | null
  bio?: string | null
  experience_years?: number | null
  is_verified?: boolean
  is_approved?: boolean
  is_active?: boolean
  status_note?: string
  deactivate_reason?: string | null
}

export interface ServiceCategory {
  id?: number
  name: string
  key: string
  status: ServiceCategoryStatus
  description: string
  icon?: string
  service_image?: string | null
  start_date: string
  display_order?: number
}

export interface PopularProvider {
  id: number
  username: string
  role: string
  profile_picture?: string | null
  average_rating: number
  total_reviews: number
  is_verified?: boolean
}

export interface ActiveService {
  id: number
  name: string
  key: string
  description: string
  status: 'active'
  service_image: string | null
}

export interface CustomerAddress {
  id: number
  title: string
  address: string
  latitude: number | null
  longitude: number | null
  /** Convenience aliases for map components */
  lat?: number | null
  lon?: number | null
}

export type PolygonPoint = { lat: number; lon: number }

export interface LoginResponse {
  success: boolean
  message: string
  token: string
  user: User
  redirect_url: string
}

export interface PortfolioImage {
  id: number
  image: string
  caption: string
}

export interface Lead {
  id: number
  customer: string
  service_type?: string
  address: string
  lat: number | null
  lon: number | null
  area?: number | null
  lawn_area?: number | null
  polygon_points?: PolygonPoint[] | null
  description: string | null
  image: string | null
  status: string
  has_quoted: boolean
  is_booked?: boolean
  created_at?: string
  my_quote?: {
    id: number
    price: number
    message: string | null
    status: string
  } | null
}

export interface Quote {
  id: number
  provider: string
  provider_id: number
  provider_email: string
  provider_phone: string | null
  provider_address: string | null
  provider_role?: string
  is_verified?: boolean
  provider_profile_picture?: string | null
  bio?: string | null
  experience_years?: number | null
  portfolio_images?: PortfolioImage[]
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
  provider_role?: string
  is_verified?: boolean
  provider_profile_picture?: string | null
  bio?: string | null
  experience_years?: number | null
  portfolio_images?: PortfolioImage[]
  average_rating: number
  total_reviews: number
}

export interface ApiError {
  success: false
  message?: string
  errors?: Record<string, string[]>
}
