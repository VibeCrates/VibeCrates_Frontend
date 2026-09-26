import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AuthCallbackPage } from '../features/auth/pages/AuthCallbackPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { useAccessToken } from '../features/auth/model/useAccessToken'
import { ArchivePage } from '../features/board/pages/ArchivePage'
import { HomePage } from '../features/board/pages/HomePage'
import { useOnboardingStatus } from '../features/onboarding/model/onboardingQueries'
import { OnboardingPage } from '../features/onboarding/pages/OnboardingPage'
import { SearchResultPage } from '../features/search/pages/SearchResultPage'

/**
 * 로그인했고, 가입 직후 취향 콘텐츠까지 고른 사용자만 들인다.
 *
 * 콘텐츠를 고르기 전에는 취향 벡터가 없어 추천을 만들 수 없다. 그래서 OAuth 콜백이 어디로 보내든,
 * 주소를 직접 치든, 고르기 전에는 전부 /onboarding으로 돌린다. 검사를 화면마다 두지 않고 여기 한 곳에 둔다.
 */
function RequireAuth({ children }: { children: ReactNode }) {
  const accessToken = useAccessToken()
  const onboarding = useOnboardingStatus(Boolean(accessToken))

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }
  if (onboarding.isPending) {
    return <main className="status-page">계정 정보를 확인하고 있습니다.</main>
  }
  if (onboarding.isError) {
    return (
      <main className="status-page">
        <div className="section-state">
          <span>계정 정보를 불러오지 못했어요.</span>
          <button type="button" onClick={() => void onboarding.refetch()}>
            다시 불러오기
          </button>
        </div>
      </main>
    )
  }
  if (!onboarding.data.initialContentsSelected) {
    return <Navigate to="/onboarding" replace />
  }
  return children
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
      <Route path="/search" element={<RequireAuth><SearchResultPage /></RequireAuth>} />
      {/* 탭은 별도 라우트가 아니라 ?tab= 쿼리다. 세 목록이 같은 화면의 세 뷰라 URL을 나눌 이유가 없고,
          링크 공유와 뒤로 가기도 쿼리 하나로 자연스럽게 따라온다. */}
      <Route path="/archive" element={<RequireAuth><ArchivePage /></RequireAuth>} />
      {/* RequireAuth로 감싸지 않는다. 그 가드가 고르기 전의 사용자를 여기로 보내므로 감싸면 무한히 돌려보낸다.
          로그인 여부와 "이미 골랐는지"는 화면이 직접 확인한다. */}
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
