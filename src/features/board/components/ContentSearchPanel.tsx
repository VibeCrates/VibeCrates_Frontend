import { useState } from 'react'
import { MIN_SEARCH_LENGTH } from '../../content/api/contentApi'
import { useContentSearch } from '../../content/model/contentQueries'
import { useDebouncedValue } from '../../content/model/useDebouncedValue'
import { ContentArtwork } from './ContentArtwork'
import type { ContentSummary } from '../../../shared/types/content'

interface ContentSearchPanelProps {
  /** 교체 대상 슬롯의 현재 콘텐츠. 무엇을 바꾸는 중인지 보여준다. */
  current: ContentSummary
  /** 이미 보드에 담긴 콘텐츠 id. 같은 콘텐츠를 두 번 담을 수 없다. */
  boardContentIds: number[]
  isSaving: boolean
  onSelect: (content: ContentSummary) => void
  onClose: () => void
}

export function ContentSearchPanel({
  current,
  boardContentIds,
  isSaving,
  onSelect,
  onClose,
}: ContentSearchPanelProps) {
  const [keyword, setKeyword] = useState('')
  // 한 글자마다 요청하면 타이핑 한 번에 대여섯 번이 나간다.
  const debouncedKeyword = useDebouncedValue(keyword)
  const search = useContentSearch(debouncedKeyword)

  const trimmed = debouncedKeyword.trim()
  const isReady = trimmed.length >= MIN_SEARCH_LENGTH
  const results = search.data?.pages.flat() ?? []

  return (
    <aside className="content-search" aria-label="교체할 콘텐츠 검색">
      <header className="content-search__head">
        <div>
          <span className="board-modal__no">REPLACE</span>
          <h3>{current.title || '제목 미상'}</h3>
          <p>바꿀 콘텐츠를 검색해 선택하세요</p>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="검색 닫기">
          ×
        </button>
      </header>

      <input
        className="content-search__input"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder="제목을 영어로 입력 (예: harry potter)"
        maxLength={100}
        autoComplete="off"
        autoFocus
        disabled={isSaving}
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
                // 이미 보드에 있는 콘텐츠는 고를 수 없다. 서버도 uk_board_item_content로 막는다.
                const alreadyInBoard =
                  content.id !== current.id && boardContentIds.includes(content.id)

                return (
                  <li key={content.id}>
                    <button
                      className="content-search__item"
                      type="button"
                      disabled={isSaving || alreadyInBoard}
                      onClick={() => onSelect(content)}
                    >
                      <span className="content-search__thumb">
                        <ContentArtwork content={content} />
                      </span>
                      <span className="content-search__meta">
                        <strong>{content.title || '제목 미상'}</strong>
                        <span>
                          {content.contentType} · {content.releaseYear ?? '연도 미상'}
                          {alreadyInBoard ? ' · 이미 담김' : ''}
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
    </aside>
  )
}
