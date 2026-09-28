import html2canvas from 'html2canvas'
import { useEffect, useRef, useState } from 'react'
import type { BoardLikeResult } from '../api/boardApi'
import type { BoardWithContents } from '../../../shared/types/board'
import { useBoardEditor } from '../model/useBoardEditor'
import { BoardCollage } from './BoardCollage'
import { BoardLikeButton } from './BoardLikeButton'
import { BoardTitleEditor } from './BoardTitleEditor'
import { ContentDetailPanel } from './ContentDetailPanel'
import { ContentSearchPanel } from './ContentSearchPanel'

interface BoardExpandModalProps {
  board: BoardWithContents
  onClose: () => void
  /**
   * 좋아요/취소 결과. 아직 저장 전인 보드(추천 보드)는 여기서 boardId가 처음 생기므로,
   * 부모가 목록 캐시를 맞춰줘야 모달을 닫은 뒤에도 상태가 유지된다.
   */
  onLikeResult?: (result: BoardLikeResult) => void
  /**
   * 제목/콘텐츠를 저장한 결과. 내 보드가 아니거나 아직 저장 전이면 서버가 새 보드를 만들기 때문에
   * <b>boardId가 바뀌어 돌아올 수 있다</b>. 부모가 이 값으로 화면과 캐시를 맞춰야 한다.
   */
  onBoardUpdated?: (board: BoardWithContents) => void
}

/**
 * 인기 보드를 그 자리에서 확대해 보여준다.
 *
 * 보드 데이터는 /api/boards/liked 응답에 제목·좋아요·콘텐츠 8건이 모두 들어 있어
 * 확대할 때 서버를 다시 부르지 않는다. 콘텐츠를 클릭할 때만 상세를 조회한다.
 */
export function BoardExpandModal({
  board,
  onClose,
  onLikeResult,
  onBoardUpdated,
}: BoardExpandModalProps) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [captureNotice, setCaptureNotice] = useState<string | null>(null)
  const captureAreaRef = useRef<HTMLDivElement>(null)
  const editor = useBoardEditor(board, onBoardUpdated)

  async function handleCapture() {
    if (!captureAreaRef.current) {
      return
    }
    setIsCapturing(true)
    setCaptureNotice(null)

    try {
      const canvas = await html2canvas(captureAreaRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        // 콜라주 위의 "수정" 버튼과 콘텐츠 설명(종류·제목·연도)은 평소엔 숨어 있지만, 캡처 순간
        // 포커스가 남아 있으면 보인다. 보드 제목 외의 글자가 사진에 들어가지 않도록 아예 뺀다.
        ignoreElements: (element) => element.hasAttribute('data-capture-exclude'),
        // 캡처 전용 제목은 화면에서 숨겨 두고, html2canvas가 만든 복제본에서만 드러낸다.
        onclone: (_document, element) => {
          element.querySelectorAll<HTMLElement>('[data-capture-only]').forEach((node) => {
            node.hidden = false
          })
        },
      })
      const link = document.createElement('a')
      link.download = `${board.title || 'crates-board'}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      setCaptureNotice('보드를 PNG로 저장했습니다.')
    } catch {
      setCaptureNotice('이미지 캡처에 실패했습니다. 이미지 서버의 CORS 설정을 확인해주세요.')
    } finally {
      setIsCapturing(false)
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }
      // 편집 중이면 그것만 닫고 보드는 유지한다.
      if (editor.editingSlot !== null) {
        editor.cancelSlotEdit()
      } else if (editor.isRenaming) {
        editor.cancelRename()
      } else if (editor.selected) {
        editor.setSelected(null)
      } else {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [editor, onClose])

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
        {/* 버튼과 상세 패널은 캡처 영역 밖에 둔다. PNG에는 보드 제목과 콜라주만 담긴다. */}
        <div className="board-modal__actions">
          <BoardLikeButton
            boardId={board.boardId}
            title={board.title || '제목 없는 보드'}
            contents={board.contents}
            initialLiked={board.liked}
            initialLikeCount={board.likeCount}
            onLikeResult={onLikeResult}
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
                {board.boardId === null
                  ? 'NEW CRATE'
                  : `CRATE NO. ${String(board.boardId).padStart(3, '0')}`}
              </span>
              <BoardTitleEditor
                isEditing={editor.isRenaming}
                isSaving={editor.isSaving}
                onCancel={editor.cancelRename}
                onStart={editor.startRename}
                onSubmit={editor.rename}
                title={board.title ?? ''}
              />
              <p>
                {board.contents.length} pieces · 좋아요 {board.likeCount.toLocaleString()}
              </p>
            </div>
            {/*
              캡처 대상은 보드 제목과 콜라주뿐이다. 위의 제목 영역(CRATE NO., 제목 수정 버튼·입력창,
              pieces·좋아요 수)은 화면에만 보이고 PNG에는 담기지 않는다.
            */}
            <div className="board-modal__canvas" ref={captureAreaRef}>
              {/*
                PNG에만 들어가는 제목. 위의 제목은 수정 버튼과 입력창이 섞여 있어 그대로 찍으면 글자가 따라 들어간다.
                화면에서는 제목이 이미 보이므로 숨겨 두고, 캡처 복제본에서만 보이게 한다(handleCapture의 onclone).
              */}
              <h2 className="board-modal__capture-title" data-capture-only hidden>
                {board.title || '제목 없는 보드'}
              </h2>
              <BoardCollage
                contents={board.contents}
                interactive
                onContentSelect={editor.setSelected}
                // 어떤 콘텐츠인지는 슬롯 번호로 다시 찾으므로 위치만 쓴다.
                onContentEdit={(_content, slotIndex) => editor.startSlotEdit(slotIndex)}
              />
            </div>
          </div>

          {editor.editingSlot !== null && board.contents[editor.editingSlot] ? (
            <ContentSearchPanel
              boardContentIds={board.contents.map((content) => content.id)}
              current={board.contents[editor.editingSlot]}
              isSaving={editor.isSaving}
              key={editor.editingSlot}
              onClose={editor.cancelSlotEdit}
              onSelect={editor.replaceSlot}
            />
          ) : editor.selected ? (
            <ContentDetailPanel
              content={editor.selected}
              key={editor.selected.id}
              onClose={() => editor.setSelected(null)}
            />
          ) : (
            <p className="board-modal__hint">
              포스터를 클릭하면 상세 정보를 볼 수 있어요.
              포스터에 마우스를 올리면 수정 버튼이 나타납니다.
              {board.boardId === null ? ' 수정하면 내 보드로 저장됩니다.' : ''}
            </p>
          )}
        </div>

        <div className="board-modal__notice" aria-live="polite">
          {editor.notice ?? captureNotice}
        </div>
      </div>
    </div>
  )
}
