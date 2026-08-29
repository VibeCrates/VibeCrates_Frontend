import { apiRequest } from '../../../shared/api'
import { setAccessToken } from '../../../shared/api/accessToken'
import type { AccessTokenResponse } from '../../../shared/types/api'

export type OAuthProvider = 'google' | 'kakao' | 'naver'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

export interface LoginRequest {
  loginId: string
  pwd: string
}

export interface SignupRequest extends LoginRequest {
  email: string
  nickname: string
  gender: Gender
  birthYear: string
}

export interface ProfileRequest {
  email: string
  nickname: string
  gender: Gender
  birthYear: string
}

async function receiveAccessToken(
  path: string,
  body: unknown,
): Promise<AccessTokenResponse> {
  const data = await apiRequest<AccessTokenResponse>(path, {
    method: 'POST',
    body: JSON.stringify(body),
    skipAuthRefresh: true,
  })
  setAccessToken(data.accessToken)
  return data
}

export function login(request: LoginRequest): Promise<AccessTokenResponse> {
  return receiveAccessToken('/api/auth/login', request)
}

export function signup(request: SignupRequest): Promise<AccessTokenResponse> {
  return receiveAccessToken('/api/auth/signup', request)
}

export function exchangeOAuthToken(tempToken: string): Promise<AccessTokenResponse> {
  return receiveAccessToken('/api/auth/oauth-token', { tempToken })
}

export function completeProfile(request: ProfileRequest): Promise<void> {
  return apiRequest<void>('/api/auth/profile', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<void>('/api/auth/logout', {
      method: 'POST',
      skipAuthRefresh: true,
    })
  } finally {
    setAccessToken(null)
  }
}

export function getOAuthAuthorizationUrl(provider: OAuthProvider): string {
  const authOrigin = import.meta.env.VITE_AUTH_ORIGIN.replace(/\/$/, '')
  return `${authOrigin}/oauth2/authorization/${provider}`
}
