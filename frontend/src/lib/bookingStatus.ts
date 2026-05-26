import type { BookingStatus } from '../types'

export const EDITABLE_BOOKING_STATUSES: BookingStatus[] = ['assigned', 'in_progress']

export function canEditBookingStatus(status: BookingStatus): boolean {
  return EDITABLE_BOOKING_STATUSES.includes(status)
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
