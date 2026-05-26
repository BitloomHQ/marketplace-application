export type UserRole = 'customer' | 'gardener' | 'electrician' | 'plumber' | 'admin'

export type ServiceType = 'gardener' | 'electrician' | 'plumber'

export type BookingStatus = 'assigned' | 'in_progress' | 'completed' | 'cancelled'

export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  phone: string
  address: string
}

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
  description: string | null
  image: string | null
  status: string
}

export interface Quote {
  id: number
  provider: string
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
  final_price: number
  status: BookingStatus
  created_at: string
  has_review?: boolean
}

export interface ApiError {
  success: false
  message?: string
  errors?: Record<string, string[]>
}
