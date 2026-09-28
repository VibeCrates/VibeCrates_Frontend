import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Brand } from '../../../app/components/Brand'
import { ApiError } from '../../../shared/api'
import type { ContentSummary, ContentType } from '../../../shared/types/content'
import { useAccessToken } from '../../auth/model/useAccessToken'
import { ContentArtwork } from '../../board/components/ContentArtwork'
import { MAX_INITIAL_CONTENTS, MIN_INITIAL_CONTENTS } from '../api/onboardingApi'
import {
  useOnboardingContents,
  useOnboardingStatus,
  useSubmitInitialContents,
} from '../model/onboardingQueries'

/** 종류별 탭. 후보는 종류마다 인기순 200개다. */
const TABS: { type: ContentType; label: string }[] = [
  { type: 'BOOK', label: '책' },
  { type: 'MOVIE', label: '영화' },
  { type: 'MUSIC', label: '음악' },
]

/**
 * 가입 직후 취향 콘텐츠를 고르는 화면.
 *
 * 종류별 인기 콘텐츠를 스크롤하며 고른다. 무엇을 검색할지 모르는 사용자도 바로 고를 수 있다.
 * 고른 콘텐츠(1~10개)의 평균이 첫 취향 벡터가 되고, 그 벡터로 첫 추천이 만들어진다.
 * 건너뛸 수 없다 — 고르기 전에는 추천에 쓸 벡터가 없어 다른 화면에 들어갈 수 없다.
 */
export function OnboardingPage() {
  const navigate = useNavigate()
  const accessToken = useAccessToken()
  const status = useOnboardingStatus(Boolean(accessToken))
  const submit = useSubmitInitialContents()

  const [activeType, setActiveType] = useState<ContentType>(TABS[0].type)
  const candidates = useOnboardingContents(activeType)
  // 고른 순서를 보여주기 위해 배열로 둔다. 개수가 10개뿐이라 some으로 충분하다.
  // 탭을 옮겨도 유지된다 — 종류를 섞어 고를 수 있다.
  const [selected, setSelected] = useState<ContentSummary[]>([])

  const isFull = selected.length >= MAX_INITIAL_CONTENTS
  const canSubmit = selected.length >= MIN_INITIAL_CONTENTS && !submit.isPending

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }
  // 이미 고른 사용자가 주소로 직접 들어오면 다시 고르게 하지 않는다. 서버도 두 번째 요청은 거절한다.
  if (status.data?.initialContentsSelected) {
    return <Navigate to="/" replace />
  }

  function toggle(content: ContentSummary) {
    setSelected((current) =>
      current.some((item) => item.id === content.id)
        ? current.filter((item) => item.id !== content.id)
        : current.length >= MAX_INITIAL_CONTENTS
          ? current
          : [...current, content],
    )
  }

  function handleSubmit() {
    submit.mutate(
      selected.map((content) => content.id),
      { onSuccess: () => navigate('/', { replace: true }) },
    )
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-page__nav">
        <Brand compact />
      </header>

      <section className="onboarding">
        <div className="onboarding__intro">
          <span className="login-kicker">Welcome to Crates</span>
          <h1>좋아하는 콘텐츠를 골라주세요</h1>
          <p>
            고른 콘텐츠로 첫 추천을 만들어요. 영화·음악·책 가리지 않고{' '}
            {MIN_INITIAL_CONTENTS}개에서 {MAX_INITIAL_CONTENTS}개까지 고를 수 있어요.
          </p>
        </div>

        <div className="onboarding__picked" aria-live="polite">
          <div className="onboarding__picked-head">
            <strong>
              {selected.length} / {MAX_INITIAL_CONTENTS}
            </strong>
            <span>{isFull ? '최대 개수를 모두 골랐어요' : '고른 콘텐츠'}</span>
          </div>
          {selected.length === 0 ? (
            <p className="onboarding__picked-empty">아래 목록에서 눌러 골라주세요.</p>
          ) : (
            <ul className="onboarding__chips">
              {selected.map((content) => (
                <li key={content.id}>
                  <button
                    className="onboarding__chip"
                    type="button"
                    onClick={() => toggle(content)}
                    disabled={submit.isPending}
                    aria-label={`${content.title || '제목 미상'} 선택 해제`}
                  >
                    <span className="onboarding__chip-thumb">
                      <ContentArtwork content={content} />
                    </span>
                    <span className="onboarding__chip-title">{content.title || '제목 미상'}</span>
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="onboarding__catalog">
          <div className="archive-tabs onboarding__tabs" role="tablist" aria-label="콘텐츠 종류">
            {TABS.map((tab) => (
              <button
                aria-selected={tab.type === activeType}
                className={`archive-tab ${tab.type === activeType ? 'is-active' : ''}`}
                key={tab.type}
                onClick={() => setActiveType(tab.type)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="onboarding__grid-scroll" role="tabpanel">
            {candidates.isPending ? (
              <p className="content-search__hint">불러오는 중…</p>
            ) : candidates.isError ? (
              <div className="content-search__hint">
                <p>목록을 불러오지 못했어요.</p>
                <button type="button" onClick={() => void candidates.refetch()}>다시 시도</button>
              </div>
            ) : (
              <ul className="onboarding__grid">
                {candidates.data.map((content) => {
                  const isSelected = selected.some((item) => item.id === content.id)

                  return (
                    <li key={content.id}>
                      <button
                        className={`onboarding__card ${isSelected ? 'onboarding__card--selected' : ''}`}
                        type="button"
                        aria-pressed={isSelected}
                        // 다 고른 뒤에도 이미 고른 것은 눌러서 뺄 수 있어야 한다.
                        disabled={submit.isPending || (isFull && !isSelected)}
                        onClick={() => toggle(content)}
                      >
                        <span className="onboarding__card-art">
                          <ContentArtwork content={content} />
                          {isSelected ? <span className="onboarding__card-check" aria-hidden="true">✓</span> : null}
                        </span>
                        <span className="onboarding__card-title">{content.title || '제목 미상'}</span>
                        <span className="onboarding__card-year">{content.releaseYear ?? '연도 미상'}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="onboarding__actions">
          {submit.isError ? (
            <p className="onboarding__error" role="alert">
              {submit.error instanceof ApiError
                ? submit.error.message
                : '저장하지 못했어요. 다시 시도해주세요.'}
            </p>
          ) : null}
          <button className="solid-button" type="button" disabled={!canSubmit} onClick={handleSubmit}>
            {submit.isPending ? '추천을 만드는 중…' : `${selected.length}개로 시작하기`}
          </button>
        </div>
      </section>
    </main>
  )
}
