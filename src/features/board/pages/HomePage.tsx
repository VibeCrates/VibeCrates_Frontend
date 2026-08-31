import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Brand } from '../../../app/components/Brand'
import { SearchBar } from '../../../app/components/SearchBar'
import { SectionHeading } from '../../../app/components/SectionHeading'
import { logout } from '../../auth/api/authApi'
import { useAccessToken } from '../../auth/model/useAccessToken'
import { useSearchVector } from '../../search/model/useSearchVector'
import { BoardCollage } from '../components/BoardCollage'
import { BoardExpandModal } from '../components/BoardExpandModal'
import { BoardTile } from '../components/BoardTile'
import { usePopularBoards, useRecommendedContents } from '../model/boardQueries'
import { useDragScroll } from '../model/useDragScroll'
import type { BoardWithContents } from '../../../shared/types/board'

function LoadingTiles({ count = 4 }: { count?: number }) {
  return (
    <div className="board-grid" aria-label="보드를 불러오는 중">
      {Array.from({ length: count }, (_, index) => (
        <div className="board-tile board-tile--loading" key={index}>
          <div className="skeleton skeleton--canvas" />
          <div className="skeleton skeleton--line" />
        </div>
      ))}
    </div>
  )
}

export function HomePage() {
  const accessToken = useAccessToken()
  const navigate = useNavigate()
  const [searchNotice, setSearchNotice] = useState<string | null>(null)
  const recommended = useRecommendedContents(Boolean(accessToken))
  const popular = usePopularBoards(Boolean(accessToken))
  const search = useSearchVector()
  const { ref: popularScrollRef, dragHandlers: popularDragHandlers } =
    useDragScroll<HTMLDivElement>()
  // 확대에 필요한 데이터(제목·좋아요·콘텐츠)가 이미 목록 응답에 들어 있어
  // 보드 객체를 그대로 들고 있으면 추가 조회 없이 모달을 띄울 수 있다.
  const [expandedBoard, setExpandedBoard] = useState<BoardWithContents | null>(null)

  function handleSearch(keyword: string) {
    setSearchNotice(null)
    search.mutate(keyword, {
      onSuccess: () => {
        setSearchNotice(`“${keyword}” 검색 분석이 완료되었습니다.`)
      },
      onError: () => {
        setSearchNotice('검색을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.')
      },
    })
  }

  async function handleLogout() {
    // logout API가 실패해도 로컬 토큰은 이미 비워지므로 로그인 화면으로 반드시 이동시킨다.
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <main className="home-page">
      <header className="home-nav">
        <button className="text-button" type="button" onClick={() => void handleLogout()}>
          로그아웃
        </button>
      </header>

      <section className="home-hero">
        <h1>Crates</h1>
        <SearchBar isPending={search.isPending} onSearch={handleSearch} />
        <div className="search-feedback" aria-live="polite">
          {searchNotice}
        </div>
      </section>

      <div className="home-content">
        <section className="board-section">
          <SectionHeading title="오늘의 추천 보드" />
          {recommended.isPending ? (
            <div className="skeleton skeleton--featured" />
          ) : recommended.isError ? (
            <div className="section-state">
              <span>추천 보드를 불러오지 못했어요.</span>
              <button type="button" onClick={() => void recommended.refetch()}>다시 불러오기</button>
            </div>
          ) : (
            <div className="featured-board">
              <BoardCollage contents={recommended.data ?? []} interactive />
            </div>
          )}
        </section>

        <section className="board-section">
          <SectionHeading title="내 보드" />
          <div className="empty-crate">
            <h3>첫 번째 보드를 기다리고 있어요.</h3>
            <p>보드 생성 API가 연결되면 검색으로 만든 컬렉션이 이곳에 쌓입니다.</p>
          </div>
        </section>

        <section className="board-section">
          <SectionHeading title="인기 보드" />
          {popular.isPending ? (
            <LoadingTiles />
          ) : popular.isError ? (
            <div className="section-state">
              <span>인기 보드를 불러오지 못했어요.</span>
              <button type="button" onClick={() => void popular.refetch()}>다시 불러오기</button>
            </div>
          ) : popular.data?.length ? (
            <div className="board-grid" ref={popularScrollRef} {...popularDragHandlers}>
              {popular.data.map((board) => (
                <BoardTile board={board} key={board.boardId} onOpen={setExpandedBoard} />
              ))}
            </div>
          ) : (
            <div className="section-state">아직 공개된 인기 보드가 없습니다.</div>
          )}
        </section>
      </div>

      {expandedBoard ? (
        <BoardExpandModal board={expandedBoard} onClose={() => setExpandedBoard(null)} />
      ) : null}

      <footer className="site-footer">
        <Brand compact />
        <span>Films · Sounds · Stories</span>
      </footer>
    </main>
  )
}
