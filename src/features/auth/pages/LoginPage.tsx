import { Navigate } from 'react-router'
import { Brand } from '../../../app/components/Brand'
import {
  getOAuthAuthorizationUrl,
  type OAuthProvider,
} from '../api/authApi'
import { useAccessToken } from '../model/useAccessToken'

const providers: Array<{ id: OAuthProvider; label: string }> = [
  { id: 'google', label: 'Google로 계속하기' },
  { id: 'kakao', label: 'Kakao로 계속하기' },
  { id: 'naver', label: 'Naver로 계속하기' },
]

export function LoginPage() {
  const accessToken = useAccessToken()

  if (accessToken) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="login-page">
      <section className="login-art" aria-hidden="true">
        <div className="login-art__masthead">
          <Brand />
          <span>EST. 2026</span>
        </div>
        <div className="login-art__poster login-art__poster--book">
          <span>STORIES</span>
          <strong>live here</strong>
        </div>
        <div className="login-art__poster login-art__poster--film">
          <span>SCENE 24</span>
          <i />
        </div>
        <div className="login-art__record">
          <i />
          <span>PLAY WHAT YOU FEEL</span>
        </div>
        <p>Collect the things<br />that feel like you.</p>
      </section>

      <section className="login-panel">
        <div className="login-panel__inner">
          <span className="login-kicker">YOUR PERSONAL CULTURE ARCHIVE</span>
          <h1>다시 만난 취향을<br />한곳에 담아보세요.</h1>
          <p>영화, 음악, 책을 넘나드는 추천을 보드로 수집하고 오래 간직하세요.</p>
          <div className="login-providers">
            {providers.map((provider) => (
              <a
                className={`provider-button provider-button--${provider.id}`}
                key={provider.id}
                href={getOAuthAuthorizationUrl(provider.id)}
              >
                <span className="provider-button__symbol" aria-hidden="true">
                  {provider.id === 'google' ? 'G' : provider.id === 'kakao' ? 'K' : 'N'}
                </span>
                <span>{provider.label}</span>
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
          <small>계속하면 VibeCrates의 이용약관 및 개인정보 처리방침에 동의하게 됩니다.</small>
        </div>
      </section>
    </main>
  )
}
