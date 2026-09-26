import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Brand } from '../../../app/components/Brand'
import { ApiError } from '../../../shared/api'
import type { ContentSummary } from '../../../shared/types/content'
import { useAccessToken } from '../../auth/model/useAccessToken'
import { ContentArtwork } from '../../board/components/ContentArtwork'
import { MIN_SEARCH_LENGTH } from '../../content/api/contentApi'
import { useContentSearch } from '../../content/model/contentQueries'
import { useDebouncedValue } from '../../content/model/useDebouncedValue'
import { MAX_INITIAL_CONTENTS, MIN_INITIAL_CONTENTS } from '../api/onboardingApi'
import { useOnboardingStatus, useSubmitInitialContents } from '../model/onboardingQueries'

/**
 * 가입 직후 취향 콘텐츠를 고르는 화면.
 *
 * 고른 콘텐츠(1~10개)의 평균이 첫 취향 벡터가 되고, 그 벡터로 첫 추천이 만들어진다.
 * 건너뛸 수 없다 — 고르기 전에는 추천에 쓸 벡터가 없어 다른 화면에 들어갈 수 없다.
 */
export function OnboardingPage() {
  const navigate = useNavigate()
  const accessToken = useAccessToken()
  const status = useOnboardingStatus(Boolean(accessToken))
  const submit = useSubmitInitialContents()

  const [keyword, setKeyword] = useState('')
  // 한 글자마다 요청하면 타이핑 한 번에 대여섯 번이 나간다.
  const debouncedKeyword = useDebouncedValue(keyword)
  const search = useContentSearch(debouncedKeyword)
  // 고른 순서를 보여주기 위해 배열로 둔다. 개수가 10개뿐이라 includes로 충분하다.
  const [selected, setSelected] = useState<ContentSummary[]>([])

  const trimmed = debouncedKeyword.trim()
  const isReady = trimmed.length >= MIN_SEARCH_LENGTH
  const results = search.data?.pages.flat() ?? []
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
            <p className="onboarding__picked-empty">아래에서 검색해 골라주세요.</p>
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

        <div className="content-search onboarding__search">
          <input
            className="content-search__input"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="제목을 영어로 입력 (예: harry potter)"
            maxLength={100}
            autoComplete="off"
            autoFocus
            disabled={submit.isPending}
          />

          <div className="content-search__results">
            {!isReady ? (
              <p className="content-search__hint">{MIN_SEARCH_LENGTH}글자 이상 입력해주세요.</p>
            ) : search.isPending ? (
              <p className="content-search__hint">검색 중…</p>
            ) : search.isError ? (
              <div className="content-search__hint">
                <p>검색에 실패했어요.</p>
                <button type="button" onClick={() => void search.refetch()}>다시 시도</button>
              </div>
            ) : results.length === 0 ? (
              <p className="content-search__hint">“{trimmed}”와 맞는 콘텐츠가 없어요.</p>
            ) : (
              <>
                <ul className="content-search__list">
                  {results.map((content) => {
                    const isSelected = selected.some((item) => item.id === content.id)

                    return (
                      <li key={content.id}>
                        <button
                          className={`content-search__item ${isSelected ? 'content-search__item--selected' : ''}`}
                          type="button"
                          aria-pressed={isSelected}
                          // 다 고른 뒤에도 이미 고른 것은 눌러서 뺄 수 있어야 한다.
                          disabled={submit.isPending || (isFull && !isSelected)}
                          onClick={() => toggle(content)}
                        >
                          <span className="content-search__thumb">
                            <ContentArtwork content={content} />
                          </span>
                          <span className="content-search__meta">
                            <strong>{content.title || '제목 미상'}</strong>
                            <span>
                              {content.contentType} · {content.releaseYear ?? '연도 미상'}
                              {isSelected ? ' · 선택됨' : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>

                {search.hasNextPage ? (
                  <button
                    className="content-search__more"
                    type="button"
                    disabled={search.isFetchingNextPage}
                    onClick={() => void search.fetchNextPage()}
                  >
                    {search.isFetchingNextPage ? '불러오는 중…' : '더 보기'}
                  </button>
                ) : null}
              </>
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
