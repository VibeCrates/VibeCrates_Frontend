import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ContentSummary, ContentType } from '../../../shared/types/content'
import {
  getOnboardingContents,
  getOnboardingStatus,
  submitInitialContents,
  type OnboardingStatus,
} from '../api/onboardingApi'

export const ONBOARDING_STATUS_KEY = ['users', 'me', 'onboarding'] as const

/**
 * 가입 후 콘텐츠를 골랐는지.
 *
 * 한 번 true가 되면 되돌아가지 않으므로 오래 캐시한다. 화면을 옮길 때마다 묻지 않는다.
 * 로그아웃하면 queryClient가 통째로 비워지므로 다른 계정으로 새지 않는다.
 */
export function useOnboardingStatus(enabled: boolean) {
  return useQuery<OnboardingStatus>({
    queryKey: ONBOARDING_STATUS_KEY,
    queryFn: getOnboardingStatus,
    enabled,
    staleTime: Infinity,
  })
}

/**
 * 한 종류의 후보 콘텐츠. 후보는 시딩으로 정해져 바뀌지 않으므로 한 번 받으면 다시 묻지 않는다.
 * 탭을 오가도 다시 요청하지 않는다.
 */
export function useOnboardingContents(type: ContentType) {
  return useQuery<ContentSummary[]>({
    queryKey: ['contents', 'onboarding', type],
    queryFn: () => getOnboardingContents(type),
    staleTime: Infinity,
  })
}

export function useSubmitInitialContents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: submitInitialContents,
    onSuccess: () => {
      // 다시 묻지 않고 바로 통과시킨다. 이게 없으면 홈으로 가는 순간 캐시된 false에 막혀
      // 선택 화면으로 되돌아온다.
      queryClient.setQueryData<OnboardingStatus>(ONBOARDING_STATUS_KEY, {
        initialContentsSelected: true,
      })
    },
  })
}
