import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Brand } from '../../../app/components/Brand'
import { HeaderMenu } from '../../../app/components/HeaderMenu'
import { useAccessToken } from '../../auth/model/useAccessToken'
import { BoardExpandModal } from '../components/BoardExpandModal'
import { BoardTile } from '../components/BoardTile'
import { MY_BOARDS_PREFIX, useArchiveBoards } from '../model/boardQueries'
import type { MyBoardFilter } from '../api/boardApi'
import type { BoardWithContents } from '../../../shared/types/board'

/**
 * 탭 정의. URL에 쓰는 소문자 슬러그와 서버가 받는 필터 값을 한 곳에서 짝지어 둔다.
 *
 * 세 탭이 서로 배타적이지 않다는 점이 중요하다. 내가 만들고 좋아요도 누른 보드는 "좋아요"와
 * "만든 것" 양쪽에 모두 나오는 것이 맞다. 각 탭은 "이 조건을 만족하는 보드 전부"를 뜻한다.
 */
const TABS = [
  { slug: 'all', filter: 'ALL', label: '전체' },
  { slug: 'liked', filter: 'LIKED', label: '좋아요' },
  { slug: 'created', filter: 'CREATED', label: '만든 것' },
] as const satisfies readonly { slug: string; filter: MyBoardFilter; label: string }[]

type TabSlug = (typeof TABS)[number]['slug']

const DEFAULT_TAB = TABS[0]

function findTab(slug: string | null) {
  return TABS.find((tab) => tab.slug === slug) ?? DEFAULT_TAB
}

const EMPTY_MESSAGE: Record<TabSlug, { title: string; description: string }> = {
  all: {
    title: '보관함이 비어 있어요.',
    description: '마음에 드는 보드에 좋아요를 누르거나, 콘텐츠를 바꿔 나만의 보드를 만들어보세요.',
  },
  liked: {
    title: '아직 좋아요한 보드가 없어요.',
    description: '추천 보드나 검색 결과에서 하트를 누르면 여기에 담깁니다.',
  },
  created: {
    title: '아직 만든 보드가 없어요.',
    description: '보드를 열어 콘텐츠를 바꾸면 내 보드로 저장됩니다.',
  },
}

function LoadingTiles({ count = 8 }: { count?: number }) {
  return (
    <div className="archive-grid" aria-label="보드를 불러오는 중">
      {Array.from({ length: count }, (_, index) => (
        <div className="board-tile board-tile--loading" key={index}>
          <div className="skeleton skeleton--canvas" />
          <div className="skeleton skeleton--line" />
        </div>
      ))}
    </div>
  )
}

export function ArchivePage() {
  const accessToken = useAccessToken()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [expandedBoard, setExpandedBoard] = useState<BoardWithContents | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const tab = findTab(searchParams.get('tab'))
  const boards = useArchiveBoards(tab.filter, Boolean(accessToken))

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = boards

  /**
   * 바닥 감지. 화면 끝의 빈 요소가 보이기 시작하면 다음 페이지를 부른다.
   *
   * rootMargin을 넉넉히 주는 것이 핵심이다. 요소가 실제로 화면에 들어온 뒤 요청하면 사용자가
   * 스크롤을 멈추고 로딩을 쳐다보게 된다. 한 화면 앞에서 미리 시작하면 끊김 없이 이어진다.
   */
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNextPage) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // isFetchingNextPage를 함께 보지 않으면 관찰자가 연속으로 발화하는 동안
        // 같은 페이지를 여러 번 요청한다.
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { rootMargin: '600px 0px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  function handleTabChange(slug: TabSlug) {
    // replace다. 탭 전환마다 히스토리가 쌓이면 뒤로 가기로 보관함을 빠져나가는 데
    // 탭을 누른 횟수만큼 눌러야 한다.
    setSearchParams(slug === DEFAULT_TAB.slug ? {} : { tab: slug }, { replace: true })
  }

  /**
   * 모달에서 좋아요를 눌렀을 때. 목록의 구성 자체가 바뀌므로 다시 받아온다.
   *
   * 좋아요를 취소하면 좋아요 탭에서 그 보드가 빠져야 하고, 전체 탭에서도 (내가 만든 것이
   * 아니라면) 사라져야 한다. 어느 자리에 있던 것이 어떻게 빠지는지는 서버가 안다.
   */
  function handleModalLike() {
    void queryClient.invalidateQueries({ queryKey: MY_BOARDS_PREFIX })
  }

  /**
   * 콘텐츠를 교체한 결과를 반영한다.
   *
   * 내 보드가 아니면 서버가 원본을 두고 복제본을 만들어 boardId가 바뀌어 돌아온다.
   * 그때 보관함에는 원본과 복제본이 둘 다 있어야 하므로 목록을 다시 받고,
   * 모달이 보고 있는 보드만 새 것으로 갈아끼운다.
   */
  function handleBoardUpdated(updated: BoardWithContents) {
    setExpandedBoard(updated)
    void queryClient.invalidateQueries({ queryKey: MY_BOARDS_PREFIX })
  }

  /**
   * 페이지들을 하나의 목록으로 편다.
   *
   * boardId로 한 번 걸러내는 이유: 정렬 기준이 "담은 시각"이라 스크롤 도중에 보드를 하나
   * 더 담으면 목록이 한 칸씩 밀려 다음 페이지에 이미 본 보드가 한 건 딸려 온다. 오프셋
   * 페이징에서는 정상적인 현상이고, 중복 key로 React 경고가 뜨는 것만 막으면 된다.
   */
  const seen = new Set<number>()
  const allBoards = (boards.data?.pages ?? [])
    .flatMap((page) => page.content)
    .filter((board) => {
      if (board.boardId === null || seen.has(board.boardId)) {
        return false
      }
      seen.add(board.boardId)
      return true
    })

  return (
    <main className="archive-page">
      <header className="archive-page__nav">
        <Brand compact />
        <HeaderMenu />
      </header>

      <div className="home-content">
        <h1 className="archive-title">보관함</h1>

        <div className="archive-tabs" role="tablist" aria-label="보관함 분류">
          {TABS.map((item) => (
            <button
              aria-selected={item.slug === tab.slug}
              className={`archive-tab ${item.slug === tab.slug ? 'is-active' : ''}`}
              key={item.slug}
              onClick={() => handleTabChange(item.slug)}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>

        {boards.isPending ? (
          <LoadingTiles />
        ) : boards.isError ? (
          <div className="section-state">
            <span>보관함을 불러오지 못했어요.</span>
            <button type="button" onClick={() => void boards.refetch()}>
              다시 불러오기
            </button>
          </div>
        ) : allBoards.length ? (
          <>
            <div className="archive-grid">
              {allBoards.map((board) => (
                <BoardTile board={board} key={board.boardId} onOpen={setExpandedBoard} />
              ))}
            </div>

            {/* 관찰 대상. hasNextPage가 false면 렌더하지 않아 관찰도 끝난다. */}
            {hasNextPage ? <div className="archive-sentinel" ref={sentinelRef} /> : null}

            <div className="archive-foot">
              {isFetchingNextPage ? '더 불러오는 중…' : hasNextPage ? null : '마지막 보드까지 다 봤어요.'}
            </div>
          </>
        ) : (
          <div className="empty-crate">
            <h3>{EMPTY_MESSAGE[tab.slug].title}</h3>
            <p>{EMPTY_MESSAGE[tab.slug].description}</p>
          </div>
        )}
      </div>

      {expandedBoard ? (
        <BoardExpandModal
          board={expandedBoard}
          onBoardUpdated={handleBoardUpdated}
          onClose={() => setExpandedBoard(null)}
          onLikeResult={handleModalLike}
        />
      ) : null}

      <footer className="site-footer">
        <Brand compact />
        <span>Films · Sounds · Stories</span>
      </footer>
    </main>
  )
}
