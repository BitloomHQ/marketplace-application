const AUTH_TOKEN_KEY = 'marketplace_token'

/** Empty in dev (Vite proxies /api). Set VITE_API_BASE_URL for production. */
export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL
  if (typeof base === 'string' && base.length > 0) {
    return base.replace(/\/$/, '')
  }
  return ''
}

function resolvePath(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  const base = getApiBaseUrl()
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path
}

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export class ApiRequestError extends Error {
  status: number
  data: unknown

  constructor(message: string, status: number, data: unknown) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.data = data
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  auth?: boolean
  formData?: FormData
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, auth = true, formData } = options

  const headers: Record<string, string> = {}

  if (auth) {
    const token = getToken()
    if (token) headers.Authorization = `Token ${token}`
  }

  if (body && !formData) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(resolvePath(path), {
    method,
    headers,
    body: formData ?? (body ? JSON.stringify(body) : undefined),
  })

  let data: unknown = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { message: text }
    }
  }

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('text/html')) {
      throw new ApiRequestError(
        'Server error. Please try again or contact support.',
        response.status,
        data,
      )
    }
    const payload = data as { message?: string; detail?: string }
    const message =
      payload?.message ?? payload?.detail ?? `Request failed (${response.status})`
    throw new ApiRequestError(message, response.status, data)
  }

  return data as T
}
