import { ApiError } from './apiError'
import { getAccessToken, setAccessToken } from './accessToken'
import type { AccessTokenResponse, ApiResponse } from '../types/api'

const REFRESH_PATH = '/api/auth/refresh'

let refreshPromise: Promise<string | null> | null = null
let sessionRestorePromise: Promise<string | null> | null = null

interface ApiRequestOptions extends RequestInit {
  skipAuthRefresh?: boolean
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Partial<ApiResponse<unknown>>
  return (
    typeof candidate.success === 'boolean' &&
    'data' in candidate &&
    typeof candidate.message === 'string'
  )
}

async function unwrapApiResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new ApiError(response.status, '서버 응답을 해석할 수 없습니다.')
  }

  if (!isApiResponse(payload)) {
    throw new ApiError(response.status, '서버 응답 형식이 올바르지 않습니다.')
  }

  if (!response.ok || !payload.success) {
    throw new ApiError(response.status, payload.message)
  }

  return payload.data as T
}

function buildHeaders(init: RequestInit): Headers {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')

  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getAccessToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return headers
}

function send(path: string, init: RequestInit): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: buildHeaders(init),
    credentials: 'include',
  })
}

async function performRefresh(): Promise<string | null> {
  try {
    const response = await fetch(REFRESH_PATH, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    })
    const data = await unwrapApiResponse<AccessTokenResponse>(response)
    setAccessToken(data.accessToken)
    return data.accessToken
  } catch {
    setAccessToken(null)
    return null
  }
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

export function restoreSession(): Promise<string | null> {
  if (!sessionRestorePromise) {
    sessionRestorePromise = refreshAccessToken()
  }

  return sessionRestorePromise
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { skipAuthRefresh = false, ...init } = options
  const response = await send(path, init)

  if (response.status === 401 && !skipAuthRefresh && path !== REFRESH_PATH) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) {
      return unwrapApiResponse<T>(await send(path, init))
    }
  }

  return unwrapApiResponse<T>(response)
}
