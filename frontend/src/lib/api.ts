import type { Bootstrap } from './types'

export class ApiError extends Error {
  status: number
  code?: string
  fields: Record<string, string[]>

  constructor(message: string, status: number, fields: Record<string, string[]> = {}, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
    this.code = code
  }
}

let currentBootstrap: Bootstrap | null = null

export function setBootstrap(value: Bootstrap | null) {
  currentBootstrap = value
}

export function getBootstrap(): Bootstrap | null {
  return currentBootstrap
}

export function apiBase(): string {
  return currentBootstrap?.apiBase || '/api/v2'
}

export function appBase(): string {
  return currentBootstrap?.appBase || '/pulse'
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
  formData?: FormData
  headers?: Record<string, string>
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET'
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers || {}),
  }

  if (method !== 'GET' && currentBootstrap?.csrfToken) {
    headers['X-CSRFToken'] = currentBootstrap.csrfToken
  }

  let body: BodyInit | undefined
  if (options.formData) {
    body = options.formData
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  const response = await fetch(`${apiBase()}${path}`, {
    method,
    headers,
    body,
    credentials: 'same-origin',
    signal: options.signal,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json().catch(() => null) : await response.text()

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('pulse:auth-required'))
    }
    const message =
      (payload && typeof payload === 'object' && 'error' in payload && String(payload.error)) ||
      response.statusText ||
      'Request failed'
    const fields =
      payload && typeof payload === 'object' && 'fields' in payload && payload.fields
        ? (payload.fields as Record<string, string[]>)
        : {}
    const code =
      payload && typeof payload === 'object' && 'code' in payload ? String(payload.code) : undefined
    throw new ApiError(message, response.status, fields, code)
  }

  return payload as T
}

export async function fetchBootstrap(): Promise<Bootstrap> {
  // Resolve against the document base so a reverse-proxy sub-path
  // (/prefix/pulse/) reaches /prefix/api/v2/bootstrap, not /api/v2.
  const url = new URL('../api/v2/bootstrap', document.baseURI)
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new ApiError('Could not load application bootstrap', response.status)
  }
  const payload = (await response.json()) as Bootstrap
  setBootstrap(payload)
  return payload
}

export async function login(password: string): Promise<Bootstrap> {
  const payload = await apiFetch<Bootstrap>('/login', { method: 'POST', body: { password } })
  setBootstrap(payload)
  return payload
}

export async function logout(): Promise<Bootstrap> {
  const payload = await apiFetch<Bootstrap>('/logout', { method: 'POST' })
  setBootstrap(payload)
  return payload
}

export async function setLocale(locale: string): Promise<{ locale: string }> {
  return apiFetch<{ locale: string }>('/locale', { method: 'POST', body: { locale } })
}

export function buildQuery(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}
