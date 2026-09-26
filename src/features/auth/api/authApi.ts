import { apiRequest } from '../../../shared/api'
import { setAccessToken } from '../../../shared/api/accessToken'
import type { AccessTokenResponse } from '../../../shared/types/api'

export type OAuthProvider = 'google' | 'kakao' | 'naver'
export type Gender = 'MALE' | 'FEMALE' | 'OTHER'

/** 백엔드가 LocalDate로 받는 필드. 연도만 보내면 파싱에 실패하므로 YYYY-MM-DD 형식이어야 한다. */
export type IsoDate = string

export interface ProfileRequest {
  email: string
  nickname: string
  gender: Gender
  birthYear: IsoDate
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

// 가입과 로그인은 OAuth로만 한다. 백엔드의 아이디·비밀번호 로그인(/api/auth/login)은
// 부하테스트 계정 전용이라 화면에서 쓰지 않는다.

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
  // .env가 빠진 빌드에서도 로그인 화면이 죽지 않도록 방어한다.
  // 빈 값이면 동일 오리진으로 요청되므로 운영 구성과 동일하게 동작한다.
  const authOrigin = (import.meta.env.VITE_AUTH_ORIGIN ?? '').replace(/\/$/, '')
  return `${authOrigin}/oauth2/authorization/${provider}`
}
