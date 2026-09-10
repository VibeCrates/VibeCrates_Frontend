import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { Brand } from '../../../app/components/Brand'
import { HeaderMenu } from '../../../app/components/HeaderMenu'
import { SearchBar } from '../../../app/components/SearchBar'
import { useAccessToken } from '../../auth/model/useAccessToken'
import { SearchBoardResult } from '../components/SearchBoardResult'
import { buildSearchPath } from '../model/searchPath'
import { useSearchBoard } from '../model/searchQueries'

export function SearchResultPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const accessToken = useAccessToken()
  const keyword = (searchParams.get('keyword') ?? '').trim()
  const board = useSearchBoard(keyword, Boolean(accessToken))

  function handleSearch(nextKeyword: string) {
    // replace가 아니라 push다. 뒤로 가기로 직전 검색 결과에 돌아갈 수 있어야 한다.
    navigate(buildSearchPath(nextKeyword))
  }

  // 검색어 없이 들어온 URL은 보여줄 것이 없으므로 홈으로 되돌린다.
  if (!keyword) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="search-page">
      <header className="search-page__nav">
        <Brand compact />
        {/* key를 주지 않으면 뒤로 가기로 검색어가 바뀌어도 입력창이 이전 값에 머문다. */}
        <SearchBar
          compact
          initialValue={keyword}
          isPending={board.isFetching}
          key={keyword}
          onSearch={handleSearch}
        />
        <div className="search-page__actions">
          <button className="text-button" type="button" onClick={() => navigate('/')}>
            홈으로
          </button>
          <HeaderMenu />
        </div>
      </header>

      <div className="home-content">
        {board.isPending ? (
          <div className="skeleton skeleton--featured" />
        ) : board.isError ? (
          <div className="section-state">
            <span>검색 결과를 불러오지 못했어요.</span>
            <button type="button" onClick={() => void board.refetch()}>
              다시 불러오기
            </button>
          </div>
        ) : board.data?.contents.length ? (
          <SearchBoardResult board={board.data} key={keyword} keyword={keyword} />
        ) : (
          <div className="empty-crate">
            <h3>“{keyword}”와 비슷한 콘텐츠를 찾지 못했어요.</h3>
            <p>다른 검색어로 다시 시도해보세요.</p>
          </div>
        )}
      </div>
    </main>
  )
}
