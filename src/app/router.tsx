import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AuthCallbackPage } from '../features/auth/pages/AuthCallbackPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { useAccessToken } from '../features/auth/model/useAccessToken'
import { ArchivePage } from '../features/board/pages/ArchivePage'
import { HomePage } from '../features/board/pages/HomePage'
import { SearchResultPage } from '../features/search/pages/SearchResultPage'

function RequireAuth({ children }: { children: ReactNode }) {
  const accessToken = useAccessToken()
  return accessToken ? children : <Navigate to="/login" replace />
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
      <Route path="/search" element={<RequireAuth><SearchResultPage /></RequireAuth>} />
      {/* 탭은 별도 라우트가 아니라 ?tab= 쿼리다. 세 목록이 같은 화면의 세 뷰라 URL을 나눌 이유가 없고,
          링크 공유와 뒤로 가기도 쿼리 하나로 자연스럽게 따라온다. */}
      <Route path="/archive" element={<RequireAuth><ArchivePage /></RequireAuth>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
