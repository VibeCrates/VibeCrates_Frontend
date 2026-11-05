import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { BoardCollage } from '../../board/components/BoardCollage'
import { BoardEditBar } from '../../board/components/BoardEditBar'
import { BoardLikeButton } from '../../board/components/BoardLikeButton'
import { BoardTitleEditor } from '../../board/components/BoardTitleEditor'
import { ContentDetailPanel } from '../../board/components/ContentDetailPanel'
import { ContentSearchPanel } from '../../board/components/ContentSearchPanel'
import { MY_BOARDS_KEY } from '../../board/model/boardQueries'
import { useBoardEditor } from '../../board/model/useBoardEditor'
import { BOARD_CONTENT_COUNT } from '../../../shared/types/board'
import type { BoardLikeResult } from '../../board/api/boardApi'
import type { BoardWithContents, SearchBoard } from '../../../shared/types/board'

interface SearchBoardResultProps {
  board: SearchBoard
  /** 좋아요/수정 결과를 이 검색어의 캐시에 반영하기 위해 필요하다. */
  keyword: string
}

/**
 * 검색 결과 보드 본문.
 *
 * 부모가 검색어를 key로 넘겨서, 검색어가 바뀌면 이 컴포넌트가 통째로 다시 마운트된다.
 * 열어둔 상세 패널이나 앞선 검색어의 좋아요 상태가 남지 않게 하기 위해서다.
 *
 * 편집(슬롯 교체·제목 변경·배치 변경)은 보드 확대 모달과 같은 useBoardEditor를 쓴다. 저장 버튼을 눌러야 반영된다.
 */
export function SearchBoardResult({ board, keyword }: SearchBoardResultProps) {
  const queryClient = useQueryClient()
  const searchQueryKey = ['search', 'board', keyword]
  const [likeNotice, setLikeNotice] = useState<string | null>(null)

  /**
   * 검색 결과는 검색어별로 캐시된다(staleTime 30초). 갱신하지 않으면 홈으로 나갔다가 같은
   * 검색어로 다시 들어왔을 때 예전 응답이 그대로 그려진다. 서버는 이미 올바른 값을 갖고 있다.
   */
  function patchCache(next: Partial<BoardWithContents>) {
    queryClient.setQueryData<SearchBoard>(searchQueryKey, (cached) =>
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
  const title = editor.draft.title || '검색 결과'
  const ownBoard = board.owned === true && board.boardId !== null

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
            contents={editor.draft.contents}
            layout={editor.draft.layout}
            interactive
            onContentSelect={editor.setSelected}
            // 8건이 안 되면 저장 자체가 불가능하므로 수정·배치 변경도 열지 않는다.
            onContentEdit={canSave ? (_content, slotIndex) => editor.startSlotEdit(slotIndex) : undefined}
            onLayoutChange={canSave ? editor.changeLayout : undefined}
          />
          {canSave ? <BoardEditBar editor={editor} ownBoard={ownBoard} /> : null}
        </div>

        {editor.editingSlot !== null && editor.draft.contents[editor.editingSlot] ? (
          <ContentSearchPanel
            boardContentIds={editor.draft.contents.map((content) => content.id)}
            current={editor.draft.contents[editor.editingSlot]}
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
            포스터를 끌어 옮기고, 왼쪽 위 손잡이로 돌릴 수 있어요(휴대폰은 길게 눌러 옮기기).
            포스터에 마우스를 올리면 수정 버튼이 나타납니다.
            바꾼 제목·콘텐츠·배치는 저장 버튼을 눌러야 반영됩니다.
            {ownBoard ? '' : ' 저장하면 원본은 두고 내 보드로 저장됩니다.'}
          </p>
        )}
      </div>

      {canSave ? (
        <div className="search-result__actions">
          <BoardLikeButton
            boardId={board.boardId}
            // 검색 보드는 boardId가 있어도 서명 토큰으로 좋아요한다. 서버가 토큰 안의 검색어·콘텐츠로 저장해서
            // 그 사이 보드가 지워졌어도 다시 저장된다. 고쳐서 내 보드가 된 뒤에는 그 보드에 boardId로 보낸다.
            mode={board.owned ? { kind: 'saved' } : { kind: 'search', likeToken: board.likeToken }}
            initialLiked={board.liked}
            initialLikeCount={board.likeCount}
            key={board.boardId ?? 'unsaved'}
            onLikeResult={handleLikeResult}
            onLikeError={setLikeNotice}
          />
        </div>
      ) : (
        <p className="search-result__notice">
          콘텐츠가 {BOARD_CONTENT_COUNT}건이 되지 않아 이 보드는 저장할 수 없어요.
        </p>
      )}

      <div className="search-result__notice" aria-live="polite">{likeNotice ?? editor.notice}</div>
    </div>
  )
}
