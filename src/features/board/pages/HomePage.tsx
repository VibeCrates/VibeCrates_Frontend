import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Brand } from '../../../app/components/Brand'
import { HeaderMenu } from '../../../app/components/HeaderMenu'
import { SearchBar } from '../../../app/components/SearchBar'
import { SectionHeading } from '../../../app/components/SectionHeading'
import { useAccessToken } from '../../auth/model/useAccessToken'
import { buildSearchPath } from '../../search/model/searchPath'
import { BoardExpandModal } from '../components/BoardExpandModal'
import { BoardTile } from '../components/BoardTile'
import {
  MY_BOARDS_PREFIX,
  POPULAR_BOARDS_KEY,
  RECOMMENDED_BOARDS_KEY,
  useMyBoards,
  usePopularBoards,
  useRecommendedBoards,
} from '../model/boardQueries'
import { useDragScroll } from '../model/useDragScroll'
import type { BoardLikeResult } from '../api/boardApi'
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
  const queryClient = useQueryClient()
  const recommended = useRecommendedBoards(Boolean(accessToken))
  const mine = useMyBoards(Boolean(accessToken))
  const popular = usePopularBoards(Boolean(accessToken))
  const { ref: popularScrollRef, dragHandlers: popularDragHandlers } =
    useDragScroll<HTMLDivElement>()
  const { ref: myScrollRef, dragHandlers: myDragHandlers } = useDragScroll<HTMLDivElement>()
  // 확대에 필요한 데이터(제목·좋아요·콘텐츠 8건)가 이미 목록 응답에 들어 있어
  // 보드 객체를 그대로 들고 있으면 추가 조회 없이 모달을 띄울 수 있다.
  const [expandedBoard, setExpandedBoard] = useState<BoardWithContents | null>(null)
  // 추천 보드로 연 것인지. 추천 보드는 boardId가 있어도 제목·콘텐츠로 좋아요한다(BoardLikeMode).
  const [expandedRecommended, setExpandedRecommended] = useState(false)

  function openBoard(board: BoardWithContents, fromRecommended: boolean) {
    setExpandedBoard(board)
    setExpandedRecommended(fromRecommended)
  }

  /**
   * 모달에서 좋아요를 눌렀을 때 목록 캐시를 맞춘다.
   *
   * 추천 보드는 DB에 없다가 좋아요를 누른 순간 저장되며 boardId가 그때 생긴다.
   * 갱신하지 않으면 모달을 닫았을 때 타일이 예전 값(하트 빈 상태)으로 남는다.
   * 인기 보드는 useBoardLike가 자체적으로 캐시를 갱신하므로 여기서 걸리지 않는다.
   */
  function handleModalLike(result: BoardLikeResult) {
    // 객체 비교로 찾으면 안 된다. 첫 좋아요에서 캐시의 보드가 새 객체로 바뀌어, 같은 모달에서 다시 누른
    // 결과(취소)가 목록에 반영되지 않는다. 추천 보드 4개는 콘텐츠 구성이 서로 달라 구성으로 찾는다.
    const expandedContentIds = expandedBoard?.contents.map((content) => content.id).join(',')
    queryClient.setQueryData<BoardWithContents[]>(RECOMMENDED_BOARDS_KEY, (cached) =>
      cached?.map((board) =>
        board.contents.map((content) => content.id).join(',') === expandedContentIds
          ? { ...board, boardId: result.boardId, likeCount: result.likeCount, liked: result.liked }
          : board,
      ),
    )
    // 좋아요는 곧 "내 크레이트에 담기"라 내 보드 목록의 구성 자체가 바뀐다.
    // 어느 자리에 끼는지는 좋아요 수 정렬에 달려 있어 직접 계산하지 않고 다시 받아온다.
    void queryClient.invalidateQueries({ queryKey: MY_BOARDS_PREFIX })
  }

  /**
   * 모달에서 콘텐츠를 교체한 결과를 반영한다.
   *
   * 내 보드가 아니면 서버가 원본은 두고 내 보드로 새로 저장하기 때문에 boardId가 바뀌어 돌아온다.
   * 그때 목록(인기·추천)은 원본이 그대로 남아 있어야 맞으므로 캐시는 건드리지 않고,
   * 모달이 보고 있는 보드만 새 것으로 갈아끼운다.
   */
  function handleBoardUpdated(updated: BoardWithContents) {
    setExpandedBoard(updated)
    // 고친 결과는 내 보드다. 추천 보드처럼 구성으로 좋아요하지 않는다.
    setExpandedRecommended(false)

    // 내 보드를 그 자리에서 고친 경우(새로 저장이 아닌 경우)에만 목록도 같은 내용으로 맞춘다.
    queryClient.setQueryData<BoardWithContents[]>(POPULAR_BOARDS_KEY, (cached) =>
      cached?.map((board) => (board.boardId === updated.boardId ? updated : board)),
    )
    // 새로 저장되면 내 보드가 하나 늘어난다. 새 보드가 목록의 어디에 들어갈지는 서버가 안다.
    void queryClient.invalidateQueries({ queryKey: MY_BOARDS_PREFIX })
  }

  // 검색 결과는 별도 페이지에서 그린다. 여기서는 이동만 시키고,
  // 조회·로딩·실패 처리는 그 페이지가 검색어(쿼리스트링)를 근거로 스스로 맡는다.
  function handleSearch(keyword: string) {
    navigate(buildSearchPath(keyword))
  }

  return (
    <main className="home-page">
      <header className="home-nav">
        <HeaderMenu />
      </header>

      <section className="home-hero">
        <h1>Crates</h1>
        <SearchBar onSearch={handleSearch} />
      </section>

      <div className="home-content">
        <section className="board-section">
          <SectionHeading title="오늘의 추천 보드" />
          {recommended.isPending ? (
            <LoadingTiles />
          ) : recommended.isError ? (
            <div className="section-state">
              <span>추천 보드를 불러오지 못했어요.</span>
              <button type="button" onClick={() => void recommended.refetch()}>다시 불러오기</button>
            </div>
          ) : recommended.data?.length ? (
            // 인기 보드와 같은 타일 배치. 다만 4개 고정이라 좌우 스크롤이 필요 없다.
            <div className="board-grid board-grid--static">
              {recommended.data.map((board, index) => (
                <BoardTile
                  board={board}
                  key={board.boardId ?? `unsaved-${index}`}
                  onOpen={(opened) => openBoard(opened, true)}
                />
              ))}
            </div>
          ) : (
            <div className="section-state">
              아직 취향 분석이 준비되지 않았어요. 콘텐츠를 둘러보며 좋아요를 남겨보세요.
            </div>
          )}
        </section>

        <section className="board-section">
          <SectionHeading
            title="내 보드"
            action={
              // 홈은 첫 8개만 보여준다. 전부 보려면 보관함으로 간다.
              <Link className="section-heading__action" to="/archive">
                더 보기
              </Link>
            }
          />
          {mine.isPending ? (
            <LoadingTiles />
          ) : mine.isError ? (
            <div className="section-state">
              <span>내 보드를 불러오지 못했어요.</span>
              <button type="button" onClick={() => void mine.refetch()}>다시 불러오기</button>
            </div>
          ) : mine.data?.length ? (
            <div className="board-grid" ref={myScrollRef} {...myDragHandlers}>
              {mine.data.map((board) => (
                <BoardTile board={board} key={board.boardId} onOpen={(opened) => openBoard(opened, false)} />
              ))}
            </div>
          ) : (
            <div className="empty-crate">
              <h3>첫 번째 보드를 기다리고 있어요.</h3>
              <p>마음에 드는 보드에 좋아요를 누르거나, 콘텐츠를 바꿔 나만의 보드를 만들어보세요.</p>
            </div>
          )}
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
                <BoardTile board={board} key={board.boardId} onOpen={(opened) => openBoard(opened, false)} />
              ))}
            </div>
          ) : (
            <div className="section-state">아직 공개된 인기 보드가 없습니다.</div>
          )}
        </section>
      </div>

      {expandedBoard ? (
        <BoardExpandModal
          board={expandedBoard}
          recommended={expandedRecommended}
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
