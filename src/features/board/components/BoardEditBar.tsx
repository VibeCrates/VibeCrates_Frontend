import type { useBoardEditor } from '../model/useBoardEditor'

interface BoardEditBarProps {
  editor: ReturnType<typeof useBoardEditor>
  /** 내 보드면 그 자리에서 고치고, 아니면 원본은 두고 내 보드로 새로 저장한다(서버가 판단). 버튼 이름만 바꾼다. */
  ownBoard: boolean
}

/**
 * 고친 보드를 저장하는 줄. 제목·콘텐츠·배치를 화면에서 고친 뒤 여기서 한 번에 저장한다(docs/board-schema.md 12-3).
 *
 * "기본 배치로"는 배치만 돌리고 저장하지 않는다. 포스터를 건드리지 않은 기본 배치 보드는 이 버튼을 누르지 않아도
 * 기본 배치로 저장된다.
 */
export function BoardEditBar({ editor, ownBoard }: BoardEditBarProps) {
  return (
    <div className="board-edit-bar" data-capture-exclude>
      <button
        className="outline-button"
        type="button"
        disabled={!editor.canResetLayout || editor.isSaving}
        onClick={editor.resetLayout}
      >
        기본 배치로
      </button>
      <button
        className="outline-button"
        type="button"
        disabled={!editor.isDirty || editor.isSaving}
        onClick={editor.revert}
      >
        변경 취소
      </button>
      <button
        className="solid-button"
        type="button"
        disabled={!editor.canSave || editor.isSaving}
        onClick={editor.save}
      >
        {editor.isSaving ? '저장 중…' : ownBoard ? '저장' : '내 보드로 저장'}
      </button>
      {editor.duplicateBoardId !== null ? (
        <button
          className="text-button"
          type="button"
          disabled={editor.isOpeningDuplicate}
          onClick={editor.openDuplicate}
        >
          보관함의 보드 열기
        </button>
      ) : editor.isDirty ? (
        <span className="board-edit-bar__status">저장하지 않은 변경이 있어요</span>
      ) : null}
    </div>
  )
}
