/** Rewrites backend media URLs so images load through the Vite dev proxy. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('/')) return url

  try {
    const parsed = new URL(url)
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      return `${parsed.pathname}${parsed.search}`
    }
  } catch {
    /* use original */
  }

  return url
}
