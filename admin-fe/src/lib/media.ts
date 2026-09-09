/** Rewrites backend media URLs so images load in dev and production. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('/')) return url

  try {
    const parsed = new URL(url)
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      return `${parsed.pathname}${parsed.search}`
    }

    // Supabase S3 API URLs are blocked by the browser; use the public object URL.
    if (parsed.pathname.includes('/storage/v1/s3/')) {
      return url
        .replace('.storage.supabase.co', '.supabase.co')
        .replace('/storage/v1/s3/', '/storage/v1/object/public/')
    }
  } catch {
    /* use original */
  }

  return url
}
