import { useEffect, useState } from 'react'
import { getBoard } from '../api/boardApi'
import { duplicateBoardIdOf, useSaveBoard } from './boardQueries'
import { BOARD_CONTENT_COUNT } from '../../../shared/types/board'
import type { BoardWithContents, SlotLayout } from '../../../shared/types/board'
import type { ContentSummary } from '../../../shared/types/content'

/** 화면에서만 고친 보드. 저장 버튼을 누르기 전까지 서버에 보내지 않는다. */
export interface BoardDraft {
  title: string
  contents: ContentSummary[]
  /** null이면 기본 배치. 포스터를 하나라도 옮기거나 돌리면 8칸 모두의 배치가 된다. */
  layout: SlotLayout[] | null
}

function draftOf(board: BoardWithContents): BoardDraft {
  return { title: board.title ?? '', contents: board.contents, layout: board.layout ?? null }
}

/** 고친 것이 있는지 비교하는 값. 좋아요 수처럼 편집과 무관한 값은 넣지 않는다. */
function draftKey(draft: BoardDraft): string {
  return JSON.stringify([draft.title, draft.contents.map((content) => content.id), draft.layout])
}

/**
 * 보드 편집 상태와 저장을 한곳에 모은다.
 *
 * 보드 확대 모달과 검색 결과 페이지가 같은 편집 흐름(포스터 상세 보기, 슬롯 교체, 제목 변경, 배치 변경)을
 * 쓰기 때문에, 두 화면이 각자 상태를 들고 있지 않도록 훅으로 뺐다.
 *
 * 제목·콘텐츠·배치는 화면에서만 바꾸고 <b>저장 버튼 한 번</b>으로 함께 보낸다(docs/board-schema.md 12-3).
 * 바꿀 때마다 저장하면 두 칸을 바꾸는 도중의 구성이 내 다른 보드와 겹쳐 거절되거나, 추천 보드의 제목만 바꿔 봐도
 * 내 보드가 생긴다.
 *
 * 저장 결과는 `onSaved`로 올려보낸다. 서버가 원본은 두고 내 보드로 새로 저장하면 boardId가 바뀌어 돌아오므로,
 * 화면이 보고 있는 보드를 그 값으로 갈아끼워야 다음 수정이 새 보드에 이어진다.
 *
 * `originToken`은 저장 전 보드(홈 추천·검색 결과)의 likeToken이다. 그 보드를 고쳐 새로 만들 때 함께 보내,
 * 서버가 원래 제목·구성을 확인하고 뺀 작품·넣은 작품을 행동 로그에 적게 한다(백엔드 docs/board-schema.md 13-4).
 */
export function useBoardEditor(
  board: BoardWithContents,
  onSaved?: (board: BoardWithContents) => void,
  originToken: string | null = null,
) {
  /** 상세 패널에 띄운 콘텐츠. */
  const [selected, setSelected] = useState<ContentSummary | null>(null)
  /** 교체 중인 슬롯 번호(0부터). null이면 교체 중이 아니다. */
  const [editingSlot, setEditingSlot] = useState<number | null>(null)
  const [isRenaming, setIsRenaming] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  /** 제목·구성이 같아 거절됐을 때 이미 있는 내 보드. "보관함의 보드 열기"에 쓴다. */
  const [duplicateBoardId, setDuplicateBoardId] = useState<number | null>(null)
  const [isOpeningDuplicate, setIsOpeningDuplicate] = useState(false)
  const [draft, setDraft] = useState(() => draftOf(board))
  const save = useSaveBoard()

  // 보고 있는 보드가 바뀌면(저장 결과, 다른 보드 열기) 고치던 내용을 그 보드로 맞춘다. 좋아요만 바뀐 경우는
  // 편집 내용과 무관하므로 비교 값에 넣지 않는다 — 고치던 중에 좋아요를 눌러도 고친 내용이 남는다.
  const sourceKey = `${board.boardId}|${draftKey(draftOf(board))}`
  const [syncedKey, setSyncedKey] = useState(sourceKey)
  if (sourceKey !== syncedKey) {
    setSyncedKey(sourceKey)
    setDraft(draftOf(board))
    setDuplicateBoardId(null)
  }

  const isDirty = draftKey(draft) !== draftKey(draftOf(board))

  // 저장하지 않은 채 탭을 닫거나 새로고침하면 브라우저가 한 번 묻는다.
  useEffect(() => {
    if (!isDirty) {
      return
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  function update(next: Partial<BoardDraft>) {
    setDraft((current) => ({ ...current, ...next }))
    setNotice(null)
    setDuplicateBoardId(null)
  }

  return {
    draft,
    selected,
    setSelected,
    editingSlot,
    isRenaming,
    notice,
    isDirty,
    isSaving: save.isPending,
    /** 서버는 8건 고정으로 검증한다. 모자란 보드(검색 결과가 덜 찬 경우)는 저장할 수 없다. */
    canSave: isDirty && draft.contents.length === BOARD_CONTENT_COUNT && draft.title.trim() !== '',
    /** 지금 화면이 기본 배치가 아니면 참. "기본 배치로" 버튼을 켠다. */
    canResetLayout: draft.layout !== null,
    duplicateBoardId,
    isOpeningDuplicate,

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

    /** 슬롯 하나만 갈아끼운다. 새 콘텐츠는 그 칸의 배치(위치·기울기·겹침 순서)를 그대로 이어받는다. */
    replaceSlot(replacement: ContentSummary) {
      if (editingSlot === null) {
        return
      }
      update({
        contents: draft.contents.map((content, index) => (index === editingSlot ? replacement : content)),
      })
      setEditingSlot(null)
    },

    rename(title: string) {
      update({ title })
      setIsRenaming(false)
    },

    changeLayout(layout: SlotLayout[]) {
      update({ layout })
    },

    /** 배치만 기본 배치로 돌린다. 바꾼 제목·콘텐츠는 남는다. 저장 버튼을 눌러야 반영된다. */
    resetLayout() {
      update({ layout: null })
    },

    /** 저장하지 않은 변경을 모두 버린다. */
    revert() {
      setDraft(draftOf(board))
      setEditingSlot(null)
      setIsRenaming(false)
      setNotice(null)
      setDuplicateBoardId(null)
    },

    save() {
      if (save.isPending) {
        return
      }
      save.mutate(
        {
          boardId: board.boardId,
          title: draft.title,
          contentIds: draft.contents.map((content) => content.id),
          layout: draft.layout,
          // 저장된 보드는 원래 구성이 서버에 있다. 저장 전 보드를 처음 저장할 때만 보낸다.
          originToken: board.boardId === null ? originToken : null,
        },
        {
          onSuccess: (saved) => {
            setEditingSlot(null)
            setIsRenaming(false)
            setSelected(null)
            // 원본을 그대로 고쳤는지, 내 보드로 새로 저장됐는지 알려준다.
            // 새로 저장은 사용자가 요청하지 않은 동작이라 결과를 말해주지 않으면 혼란스럽다.
            setNotice(saved.boardId === board.boardId ? '보드를 저장했습니다.' : '내 보드로 저장했습니다.')
            onSaved?.(saved)
          },
          onError: (error) => {
            setDuplicateBoardId(duplicateBoardIdOf(error))
            setNotice(error instanceof Error ? error.message : '보드를 저장하지 못했습니다.')
          },
        },
      )
    },

    /**
     * 중복으로 거절됐을 때 이미 있는 내 보드로 옮겨 간다. 고치던 내용은 버린다 — 배치를 이어서 고치려면
     * 그 보드에서 다시 고친다(docs/board-schema.md 12-4).
     */
    openDuplicate() {
      if (duplicateBoardId === null || isOpeningDuplicate) {
        return
      }
      setIsOpeningDuplicate(true)
      getBoard(duplicateBoardId)
        .then((existing) => {
          setNotice('보관함에 있는 보드를 열었어요.')
          onSaved?.(existing)
        })
        .catch((error: unknown) => {
          setNotice(error instanceof Error ? error.message : '보드를 열지 못했습니다.')
        })
        .finally(() => setIsOpeningDuplicate(false))
    },
  }
}
