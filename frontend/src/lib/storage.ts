const REQUEST_IDS_KEY = 'marketplace_request_ids'

export function getStoredRequestIds(): number[] {
  try {
    const raw = localStorage.getItem(REQUEST_IDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as number[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addStoredRequestId(id: number): void {
  const ids = getStoredRequestIds()
  if (!ids.includes(id)) {
    localStorage.setItem(REQUEST_IDS_KEY, JSON.stringify([id, ...ids]))
  }
}

export function removeStoredRequestId(id: number): void {
  const ids = getStoredRequestIds().filter((x) => x !== id)
  localStorage.setItem(REQUEST_IDS_KEY, JSON.stringify(ids))
}
