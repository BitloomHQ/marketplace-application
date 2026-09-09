export function providerDeactivationReason(
  user?: { deactivate_reason?: string | null; status_note?: string | null } | null,
): string {
  return user?.deactivate_reason ?? user?.status_note ?? ''
}
