import html2canvas from 'html2canvas'
import { useEffect, useRef, useState } from 'react'
import type { BoardWithContents } from '../../../shared/types/board'
import type { ContentSummary } from '../../../shared/types/content'
import { BoardCollage } from './BoardCollage'
import { BoardLikeButton } from './BoardLikeButton'
import { ContentDetailPanel } from './ContentDetailPanel'

interface BoardExpandModalProps {
  board: BoardWithContents
  onClose: () => void
}

/**
 * 인기 보드를 그 자리에서 확대해 보여준다.
 *
 * 보드 데이터는 /api/boards/liked 응답에 제목·좋아요·콘텐츠 8건이 모두 들어 있어
 * 확대할 때 서버를 다시 부르지 않는다. 콘텐츠를 클릭할 때만 상세를 조회한다.
 */
export function BoardExpandModal({ board, onClose }: BoardExpandModalProps) {
  const [selected, setSelected] = useState<ContentSummary | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const captureAreaRef = useRef<HTMLDivElement>(null)

  async function handleCapture() {
    if (!captureAreaRef.current) {
      return
    }
    setIsCapturing(true)
    setNotice(null)

    try {
      const canvas = await html2canvas(captureAreaRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `${board.title || 'crates-board'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setNotice('보드를 PNG로 저장했습니다.')
    } catch {
      setNotice('이미지 캡처에 실패했습니다. 이미지 서버의 CORS 설정을 확인해주세요.')
    } finally {
      setIsCapturing(false)
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }
      // 상세가 열려 있으면 상세만 닫고 보드는 유지한다.
      if (selected) {
        setSelected(null)
      } else {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, selected])

  // 뒤쪽 홈 화면이 같이 스크롤되지 않도록 막는다. 모달이 열려 있는 동안 한 번만 적용하면 되므로
  // Escape 처리와 분리해서 selected가 바뀔 때마다 body 스타일을 건드리지 않게 한다.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <div
      className="board-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${board.title || '제목 없는 보드'} 확대 보기`}
    >
      {/* 배경 클릭으로 닫기. 키보드 사용자는 Escape와 닫기 버튼을 쓰므로 버튼 역할은 주지 않는다. */}
      <div className="board-modal__backdrop" onClick={onClose} aria-hidden="true" />

      <div className="board-modal__panel">
        {/* 버튼과 상세 패널은 캡처 영역 밖에 둔다. PNG에는 제목과 콜라주만 담긴다. */}
        <div className="board-modal__actions">
          <BoardLikeButton
            boardId={board.boardId}
            title={board.title || '제목 없는 보드'}
            contents={board.contents}
            initialLiked={board.liked}
            initialLikeCount={board.likeCount}
          />
          <button
            className="outline-button"
            type="button"
            disabled={isCapturing}
            onClick={() => void handleCapture()}
          >
            {isCapturing ? '캡처 중…' : '캡처하기'}
          </button>
          <button className="icon-button" type="button" onClick={onClose} aria-label="보드 닫기">
            ×
          </button>
        </div>

        <div className="board-modal__stage">
          <div className="board-modal__capture">
            <div className="board-modal__title">
              <span className="board-modal__no">
                CRATE NO. {String(board.boardId).padStart(3, '0')}
              </span>
              <h2>{board.title || '제목 없는 보드'}</h2>
              <p>
                {board.contents.length} pieces · 좋아요 {board.likeCount.toLocaleString()}
              </p>
            </div>
            {/* 캡처 대상은 콜라주뿐이다. 제목/pieces/좋아요 수는 화면에만 보이고 PNG에는 담기지 않는다. */}
            <div className="board-modal__canvas" ref={captureAreaRef}>
              <BoardCollage contents={board.contents} interactive onContentSelect={setSelected} />
            </div>
          </div>

          {selected ? (
            <ContentDetailPanel
              content={selected}
              key={selected.id}
              onClose={() => setSelected(null)}
            />
          ) : (
            <p className="board-modal__hint">포스터를 클릭하면 상세 정보를 볼 수 있어요.</p>
          )}
        </div>

        <div className="board-modal__notice" aria-live="polite">{notice}</div>
      </div>
    </div>
  )
}
