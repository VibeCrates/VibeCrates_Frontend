import { useState, type FormEvent } from 'react'

interface BoardTitleEditorProps {
  title: string
  isEditing: boolean
  isSaving: boolean
  onStart: () => void
  onCancel: () => void
  onSubmit: (title: string) => void
}

/**
 * 보드 제목. 평소에는 그냥 제목이고, 옆의 버튼을 누르면 입력창으로 바뀐다.
 *
 * 제목만 바꿔도 저장은 보드 전체를 다시 제출하는 것과 같은 요청이다. 내 보드가 아니면
 * 서버가 원본은 두고 내 보드로 새로 저장하기 때문에, 남의 보드 이름을 바꾸는 일은 생기지 않는다.
 */
export function BoardTitleEditor({
  title,
  isEditing,
  isSaving,
  onStart,
  onCancel,
  onSubmit,
}: BoardTitleEditorProps) {
  const [draft, setDraft] = useState(title)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalized = draft.trim()
    // 빈 제목은 서버가 거절하고, 그대로면 보낼 이유가 없다.
    if (!normalized || normalized === title) {
      onCancel()
      return
    }
    onSubmit(normalized)
  }

  if (!isEditing) {
    return (
      <div className="board-title">
        <h2>{title || '제목 없는 보드'}</h2>
        <button
          className="board-title__edit"
          type="button"
          disabled={isSaving}
          onClick={() => {
            setDraft(title)
            onStart()
          }}
        >
          제목 수정
        </button>
      </div>
    )
  }

  return (
    // key가 아니라 onStart 시점에 draft를 맞춰두므로, 편집을 열 때마다 현재 제목에서 시작한다.
    <form className="board-title board-title--editing" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="board-title-input">보드 제목</label>
      <input
        id="board-title-input"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        maxLength={255}
        autoComplete="off"
        autoFocus
        disabled={isSaving}
      />
      <button className="outline-button" type="submit" disabled={isSaving}>
        {isSaving ? '저장 중…' : '저장'}
      </button>
      <button className="text-button" type="button" disabled={isSaving} onClick={onCancel}>
        취소
      </button>
    </form>
  )
}
