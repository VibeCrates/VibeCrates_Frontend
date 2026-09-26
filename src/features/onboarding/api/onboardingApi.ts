import { apiRequest } from '../../../shared/api'

/** 가입 때 고를 수 있는 콘텐츠 수. 백엔드 UserVectorService와 같은 값이다. */
export const MIN_INITIAL_CONTENTS = 1
export const MAX_INITIAL_CONTENTS = 10

export interface OnboardingStatus {
  /** 취향 콘텐츠를 골라 취향 벡터가 만들어졌는지. false면 다른 화면에 들어갈 수 없다. */
  initialContentsSelected: boolean
}

export function getOnboardingStatus(): Promise<OnboardingStatus> {
  return apiRequest('/api/users/me/onboarding')
}

/** 고른 콘텐츠의 평균이 첫 취향 벡터가 된다. 사용자마다 한 번만 받는다. */
export function submitInitialContents(contentIds: number[]): Promise<void> {
  return apiRequest('/api/users/me/initial-contents', {
    method: 'POST',
    body: JSON.stringify({ contentIds }),
  })
}
