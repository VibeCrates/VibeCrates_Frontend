import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { AuthCallbackPage } from '../features/auth/pages/AuthCallbackPage'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { useAccessToken } from '../features/auth/model/useAccessToken'
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
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
