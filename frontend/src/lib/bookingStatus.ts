import type { BookingStatus } from '../types'

/** Statuses where customer may cancel (matches backend). */
export const CUSTOMER_CANCELLABLE_STATUSES = ['assigned', 'pending'] as const

export const EDITABLE_BOOKING_STATUSES: BookingStatus[] = ['assigned', 'in_progress']

export function canEditBookingStatus(status: BookingStatus | string): boolean {
  if (status === 'completed' || status === 'cancelled') return false
  return (
    EDITABLE_BOOKING_STATUSES.includes(status as BookingStatus) ||
    CUSTOMER_CANCELLABLE_STATUSES.includes(status as (typeof CUSTOMER_CANCELLABLE_STATUSES)[number])
  )
}

export function canCustomerCancelBooking(status: string): boolean {
  return CUSTOMER_CANCELLABLE_STATUSES.includes(
    status as (typeof CUSTOMER_CANCELLABLE_STATUSES)[number],
  )
}

export function providerStatusOptions(current: BookingStatus): BookingStatus[] {
  if (current === 'assigned') {
    return ['assigned', 'in_progress', 'completed', 'cancelled']
  }
  if (current === 'in_progress') {
    return ['in_progress', 'completed', 'cancelled']
  }
  return [current]
}

export function customerStatusOptions(current: BookingStatus): BookingStatus[] {
  if (canEditBookingStatus(current)) {
    return [current, 'cancelled']
  }
  return [current]
}
