import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Brand } from '../../../app/components/Brand'
import { SearchBar } from '../../../app/components/SearchBar'
import { SectionHeading } from '../../../app/components/SectionHeading'
import { logout } from '../../auth/api/authApi'
import { useAccessToken } from '../../auth/model/useAccessToken'
import { useSearchVector } from '../../search/model/useSearchVector'
import { BoardCollage } from '../components/BoardCollage'
import { BoardTile } from '../components/BoardTile'
import { usePopularBoards, useRecommendedContents } from '../model/boardQueries'

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
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="home-page">
      <header className="home-nav">
        <Brand compact />
        <div className="home-nav__right">
          <span className="edition-label">YOUR CULTURE, CURATED</span>
          <button className="text-button" type="button" onClick={() => void handleLogout()}>
            로그아웃
          </button>
        </div>
      </header>

      <section className="home-hero" aria-labelledby="home-title">
        <span className="hero-kicker">A personal archive of what moves you</span>
        <h1 id="home-title">
          Find the feeling.
          <em>Keep the pieces.</em>
        </h1>
        <p>영화와 음악, 책을 하나의 감각으로 엮어 나만의 컬렉션을 만나보세요.</p>
        <SearchBar isPending={search.isPending} onSearch={handleSearch} />
        <div className="search-feedback" aria-live="polite">
          {searchNotice}
        </div>
      </section>

      <div className="home-content">
        <section className="board-section board-section--featured">
          <SectionHeading
            eyebrow="01 / For your mood"
            title="오늘의 추천"
            aside={<span>취향 벡터를 바탕으로 고른 12개의 조각</span>}
          />
          {recommended.isPending ? (
            <div className="featured-board skeleton skeleton--featured" />
          ) : recommended.isError ? (
            <div className="section-state section-state--error">
              <span>추천 보드를 불러오지 못했어요.</span>
              <button type="button" onClick={() => void recommended.refetch()}>다시 불러오기</button>
            </div>
          ) : (
            <article className="featured-board">
              <div className="featured-board__note" aria-hidden="true">
                <span>CURATED</span>
                <strong>just for you</strong>
                <small>{new Date().toLocaleDateString('ko-KR')}</small>
              </div>
              <BoardCollage contents={recommended.data ?? []} interactive />
            </article>
          )}
        </section>

        <section className="board-section">
          <SectionHeading
            eyebrow="02 / Your archive"
            title="내 보드"
            aside={<span>좋아하는 것들이 머무는 개인 서랍</span>}
          />
          <div className="empty-crate">
            <div className="empty-crate__number">00</div>
            <div>
              <h3>첫 번째 보드를 기다리고 있어요.</h3>
              <p>보드 생성 API가 연결되면 검색으로 만든 컬렉션이 이곳에 쌓입니다.</p>
            </div>
          </div>
        </section>

        <section className="board-section">
          <SectionHeading
            eyebrow="03 / Community picks"
            title="지금 사랑받는 보드"
            aside={<span>다른 수집가들이 자주 꺼내 보는 조합</span>}
          />
          {popular.isPending ? (
            <LoadingTiles />
          ) : popular.isError ? (
            <div className="section-state section-state--error">
              <span>인기 보드를 불러오지 못했어요.</span>
              <button type="button" onClick={() => void popular.refetch()}>다시 불러오기</button>
            </div>
          ) : popular.data?.length ? (
            <div className="board-grid">
              {popular.data.map((board, index) => (
                <BoardTile board={board} index={index} key={board.boardId} />
              ))}
            </div>
          ) : (
            <div className="section-state">아직 공개된 인기 보드가 없습니다.</div>
          )}
        </section>
      </div>

      <footer className="site-footer">
        <Brand compact />
        <span>Films · Sounds · Stories</span>
        <span>© {new Date().getFullYear()} VibeCrates</span>
      </footer>
    </main>
  )
}
