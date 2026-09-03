import { useQueryClient } from '@tanstack/react-query'
import { BoardCollage } from '../../board/components/BoardCollage'
import { BoardLikeButton } from '../../board/components/BoardLikeButton'
import { BoardTitleEditor } from '../../board/components/BoardTitleEditor'
import { ContentDetailPanel } from '../../board/components/ContentDetailPanel'
import { ContentSearchPanel } from '../../board/components/ContentSearchPanel'
import { MY_BOARDS_KEY } from '../../board/model/boardQueries'
import { useBoardEditor } from '../../board/model/useBoardEditor'
import { BOARD_CONTENT_COUNT } from '../../../shared/types/board'
import type { BoardLikeResult } from '../../board/api/boardApi'
import type { BoardWithContents } from '../../../shared/types/board'

interface SearchBoardResultProps {
  board: BoardWithContents
  /** 좋아요/수정 결과를 이 검색어의 캐시에 반영하기 위해 필요하다. */
  keyword: string
}

/**
 * 검색 결과 보드 본문.
 *
 * 부모가 검색어를 key로 넘겨서, 검색어가 바뀌면 이 컴포넌트가 통째로 다시 마운트된다.
 * 열어둔 상세 패널이나 앞선 검색어의 좋아요 상태가 남지 않게 하기 위해서다.
 *
 * 편집(슬롯 교체·제목 변경)은 보드 확대 모달과 같은 useBoardEditor를 쓴다.
 */
export function SearchBoardResult({ board, keyword }: SearchBoardResultProps) {
  const queryClient = useQueryClient()
  const searchQueryKey = ['search', 'board', keyword]

  /**
   * 검색 결과는 검색어별로 캐시된다(staleTime 30초). 갱신하지 않으면 홈으로 나갔다가 같은
   * 검색어로 다시 들어왔을 때 예전 응답이 그대로 그려진다. 서버는 이미 올바른 값을 갖고 있다.
   */
  function patchCache(next: Partial<BoardWithContents>) {
    queryClient.setQueryData<BoardWithContents>(searchQueryKey, (cached) =>
      cached ? { ...cached, ...next } : cached,
    )
  }

  /** 좋아요·수정은 홈의 "내 보드" 구성을 바꾼다. 홈으로 돌아갔을 때 예전 목록이 남지 않게 비운다. */
  function invalidateMyBoards() {
    void queryClient.invalidateQueries({ queryKey: MY_BOARDS_KEY })
  }

  const editor = useBoardEditor(board, (saved) => {
    patchCache(saved)
    invalidateMyBoards()
  })

  function handleLikeResult(result: BoardLikeResult) {
    patchCache({
      boardId: result.boardId,
      likeCount: result.likeCount,
      liked: result.liked,
    })
    invalidateMyBoards()
  }

  // 서버는 보드를 8건 고정으로 검증한다. 모자란 채로 좋아요를 누르면 400이 떨어지므로
  // 버튼을 내주지 않고 이유를 대신 보여준다. (Qdrant에 벡터가 덜 적재된 상태에서 발생)
  const canSave = board.contents.length === BOARD_CONTENT_COUNT
  const title = board.title || '검색 결과'

  return (
    <div className="search-result">
      <div className="search-result__header">
        <span className="board-modal__no">SEARCH CRATE</span>
        <BoardTitleEditor
          isEditing={editor.isRenaming}
          isSaving={editor.isSaving}
          onCancel={editor.cancelRename}
          onStart={editor.startRename}
          onSubmit={editor.rename}
          title={title}
        />
        <p>{board.contents.length} pieces</p>
      </div>

      <div className="search-result__stage">
        <div className="search-result__canvas">
          <BoardCollage
            contents={board.contents}
            interactive
            onContentSelect={editor.setSelected}
            onContentEdit={
              // 8건이 안 되면 저장 자체가 불가능하므로 수정도 열지 않는다.
              canSave ? (_content, slotIndex) => editor.startSlotEdit(slotIndex) : undefined
            }
          />
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
          <p className="search-result__hint">
            포스터를 클릭하면 상세 정보를 볼 수 있어요.
            포스터에 마우스를 올리면 수정 버튼이 나타납니다.
            {board.boardId === null ? ' 수정하면 내 보드로 저장됩니다.' : ''}
          </p>
        )}
      </div>

      {canSave ? (
        <div className="search-result__actions">
          <BoardLikeButton
            boardId={board.boardId}
            title={title}
            contents={board.contents}
            initialLiked={board.liked}
            initialLikeCount={board.likeCount}
            key={board.boardId ?? 'unsaved'}
            onLikeResult={handleLikeResult}
          />
        </div>
      ) : (
        <p className="search-result__notice">
          콘텐츠가 {BOARD_CONTENT_COUNT}건이 되지 않아 이 보드는 저장할 수 없어요.
        </p>
      )}

      <div className="search-result__notice" aria-live="polite">{editor.notice}</div>
    </div>
  )
}
