import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ApiError } from '../../../shared/api'
import { exchangeOAuthToken } from '../api/authApi'

export function AuthCallbackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const exchangeStartedRef = useRef(false)
  const tempToken = searchParams.get('tempToken')
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    tempToken ? null : 'OAuth 임시 토큰이 없습니다.',
  )

  useEffect(() => {
    if (!tempToken || exchangeStartedRef.current) {
      return
    }
    exchangeStartedRef.current = true

    void exchangeOAuthToken(tempToken)
      .then(() => navigate('/', { replace: true }))
      .catch((error: unknown) => {
        setErrorMessage(
          error instanceof ApiError
            ? error.message
            : 'OAuth 로그인 처리 중 오류가 발생했습니다.',
        )
      })
  }, [navigate, tempToken])

  if (errorMessage) {
    return (
      <main className="status-page">
        <h1>로그인에 실패했습니다.</h1>
        <p>{errorMessage}</p>
        <Link to="/login">로그인 화면으로 돌아가기</Link>
      </main>
    )
  }

  return <main className="status-page">OAuth 로그인을 완료하고 있습니다.</main>
}
