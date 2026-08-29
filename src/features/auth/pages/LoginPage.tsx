import { Navigate } from 'react-router'
import {
  getOAuthAuthorizationUrl,
  type OAuthProvider,
} from '../api/authApi'
import { useAccessToken } from '../model/useAccessToken'

const providers: Array<{ id: OAuthProvider; label: string; symbol: string }> = [
  { id: 'google', label: 'Google로 계속하기', symbol: 'G' },
  { id: 'kakao', label: 'Kakao로 계속하기', symbol: 'K' },
  { id: 'naver', label: 'Naver로 계속하기', symbol: 'N' },
]

export function LoginPage() {
  const accessToken = useAccessToken()

  if (accessToken) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-panel__inner">
          <span className="login-kicker">Your personal culture archive</span>
          <h1>Crates</h1>
          <p>영화, 음악, 책을 넘나드는 추천을 보드로 모으고 오래 간직하세요.</p>
          <div className="login-providers">
            {providers.map((provider) => (
              <a
                className={`provider-button provider-button--${provider.id}`}
                key={provider.id}
                href={getOAuthAuthorizationUrl(provider.id)}
              >
                <span className="provider-button__symbol" aria-hidden="true">
                  {provider.symbol}
                </span>
                <span>{provider.label}</span>
                <span aria-hidden="true">→</span>
              </a>
            ))}
          </div>
          <small>계속하면 VibeCrates의 이용약관 및 개인정보 처리방침에 동의하게 됩니다.</small>
        </div>
      </section>
    </main>
  )
}
