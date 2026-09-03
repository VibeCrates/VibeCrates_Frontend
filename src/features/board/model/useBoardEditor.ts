import { useState } from 'react'
import { useSaveBoard } from './boardQueries'
import type { BoardWithContents } from '../../../shared/types/board'
import type { ContentSummary } from '../../../shared/types/content'

/**
 * 보드 편집 상태와 저장을 한곳에 모은다.
 *
 * 보드 확대 모달과 검색 결과 페이지가 같은 편집 흐름(포스터 상세 보기, 슬롯 교체, 제목 변경)을
 * 쓰기 때문에, 두 화면이 각자 상태를 들고 있지 않도록 훅으로 뺐다.
 *
 * 저장 결과는 `onSaved`로 올려보낸다. 서버가 복제본을 만들면 boardId가 바뀌어 돌아오므로,
 * 화면이 보고 있는 보드를 그 값으로 갈아끼워야 다음 수정이 새 보드에 이어진다.
 */
export function useBoardEditor(
  board: BoardWithContents,
  onSaved?: (board: BoardWithContents) => void,
) {
  /** 상세 패널에 띄운 콘텐츠. */
  const [selected, setSelected] = useState<ContentSummary | null>(null)
  /** 교체 중인 슬롯 번호(0부터). null이면 교체 중이 아니다. */
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const save = useSaveBoard()

  function submit(title: string, contentIds: number[]) {
    save.mutate(
      { boardId: board.boardId, title, contentIds },
      {
        onSuccess: (saved) => {
          setEditingSlot(null)
          setIsRenaming(false)
          setSelected(null)
          // 원본을 그대로 고쳤는지, 내 보드로 복제됐는지 알려준다.
          // 복제는 사용자가 요청하지 않은 동작이라 결과를 말해주지 않으면 혼란스럽다.
          setNotice(
            saved.boardId === board.boardId ? '보드를 수정했습니다.' : '내 보드로 저장했습니다.',
          )
          onSaved?.(saved)
        },
        onError: (error) => {
          setNotice(error instanceof Error ? error.message : '보드를 저장하지 못했습니다.')
        },
      },
    )
  }

  return {
    selected,
    setSelected,
    editingSlot,
    isRenaming,
    notice,
    isSaving: save.isPending,

    startSlotEdit(slotIndex: number) {
      setSelected(null)
      setIsRenaming(false)
      setEditingSlot(slotIndex)
    },
    cancelSlotEdit() {
      setEditingSlot(null)
    },
    startRename() {
      setIsRenaming(true)
    },
    cancelRename() {
      setIsRenaming(false)
    },

    /** 슬롯 하나만 갈아끼운다. 나머지 순서는 그대로 둔다. */
    replaceSlot(replacement: ContentSummary) {
      if (editingSlot === null) {
        return
      }
      const contentIds = board.contents.map((content, index) =>
        index === editingSlot ? replacement.id : content.id,
      )
      submit(board.title ?? '', contentIds)
    },

    /** 콘텐츠는 그대로 두고 제목만 바꾼다. */
    rename(title: string) {
      submit(
        title,
        board.contents.map((content) => content.id),
      )
    },
  }
}
