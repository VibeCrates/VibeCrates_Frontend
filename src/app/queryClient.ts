import { QueryClient } from '@tanstack/react-query'
import {
  getAccessToken,
  subscribeToAccessToken,
} from '../shared/api/accessToken'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

// 토큰이 사라지면(로그아웃·세션 만료) 이전 사용자의 응답이 캐시에 남지 않도록 비운다.
// 쿼리 키에 사용자 식별자가 없기 때문에, 이 정리가 없으면 staleTime 안에 다른 계정으로
// 로그인했을 때 앞선 사용자의 추천·보드가 그대로 렌더된다.
// 로그아웃 경로가 늘어나도 빠뜨리지 않도록 화면이 아니라 토큰 저장소를 구독한다.
subscribeToAccessToken(() => {
  if (getAccessToken() === null) {
    queryClient.clear()
  }
})
