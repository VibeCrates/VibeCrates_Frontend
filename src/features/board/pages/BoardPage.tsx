import html2canvas from 'html2canvas'
import { useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Brand } from '../../../app/components/Brand'
import { SearchBar } from '../../../app/components/SearchBar'
import { useAccessToken } from '../../auth/model/useAccessToken'
import { useSearchVector } from '../../search/model/useSearchVector'
import { BoardCollage } from '../components/BoardCollage'
import { useBoard } from '../model/boardQueries'

export function BoardPage() {
  const { boardId: boardIdParam } = useParams()
  const boardId = boardIdParam && /^\d+$/.test(boardIdParam) ? Number(boardIdParam) : null
  const accessToken = useAccessToken()
  const navigate = useNavigate()
  const captureAreaRef = useRef<HTMLDivElement>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const board = useBoard(boardId, Boolean(accessToken))
  const search = useSearchVector()

  if (boardId === null) {
    return <Navigate to="/" replace />
  }

  function handleSearch(keyword: string) {
    setNotice(null)
    search.mutate(keyword, {
      onSuccess: () => setNotice(`“${keyword}” 검색 분석을 완료했습니다.`),
      onError: () => setNotice('검색을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'),
    })
  }

  async function handleCapture() {
    if (!captureAreaRef.current || !board.data) return
    setIsCapturing(true)
    setNotice(null)

    try {
      const canvas = await html2canvas(captureAreaRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `${board.data.title || 'crates-board'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setNotice('보드를 PNG로 저장했습니다.')
    } catch {
      setNotice('이미지 캡처에 실패했습니다. 이미지 서버의 CORS 설정을 확인해주세요.')
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <main className="board-page">
      <header className="board-nav">
        <button className="nav-back" type="button" onClick={() => navigate('/')}>
          <span aria-hidden="true">←</span>
          <span>나가기</span>
        </button>
        <SearchBar
          compact
          initialValue={board.data?.title ?? ''}
          isPending={search.isPending}
          onSearch={handleSearch}
        />
        <div className="board-nav__actions">
          <button
            className="outline-button"
            type="button"
            disabled
            title="보드 저장 API가 제공되면 활성화됩니다."
          >
            내 컬렉션에 저장
          </button>
          <button
            className="solid-button"
            type="button"
            disabled={isCapturing || !board.data}
            onClick={() => void handleCapture()}
          >
            {isCapturing ? '캡처 중…' : '캡처하기'}
          </button>
        </div>
      </header>

      <div className="board-notice" aria-live="polite">{notice}</div>

      {board.isPending ? (
        <div className="board-loading">
          <div className="skeleton skeleton--title" />
          <div className="skeleton skeleton--board" />
        </div>
      ) : board.isError ? (
        <div className="board-error">
          <Brand />
          <h1>보드를 꺼내오지 못했어요.</h1>
          <p>보드가 존재하는지 확인한 뒤 다시 시도해주세요.</p>
          <button className="solid-button" type="button" onClick={() => void board.refetch()}>
            다시 불러오기
          </button>
        </div>
      ) : board.data ? (
        <div className="board-stage" ref={captureAreaRef}>
          <div className="board-stage__heading">
            <span>CRATE NO. {String(board.data.boardId).padStart(3, '0')}</span>
            <h1>{board.data.title || '제목 없는 보드'}</h1>
            <p>
              {board.data.contents.length} pieces · {board.data.likeCount.toLocaleString()} saves
            </p>
          </div>
          <div className="board-stage__canvas">
            <BoardCollage contents={board.data.contents} interactive />
          </div>
        </div>
      ) : null}
    </main>
  )
}
