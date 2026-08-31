import { useState } from 'react'
import { useBoardLike } from '../model/boardQueries'
import type { ContentSummary } from '../../../shared/types/content'

interface BoardLikeButtonProps {
  /** DB에 저장된 보드면 id, "오늘의 추천 보드"처럼 아직 저장 전이면 null. */
  boardId: number | null
  title: string
  contents: ContentSummary[]
  initialLiked?: boolean
  initialLikeCount?: number
  onSaved?: (boardId: number) => void
}

export function BoardLikeButton({
  boardId,
  title,
  contents,
  initialLiked = false,
  initialLikeCount = 0,
  onSaved,
}: BoardLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const like = useBoardLike()

  function handleClick() {
    // 서버도 멱등하게 처리하지만, 연타로 요청 자체가 쌓이지 않도록 진행 중에는 프론트에서 먼저 막는다.
    if (like.isPending) {
      return
    }

    like.mutate(
      { boardId, liked, title, contentIds: contents.map((content) => content.id) },
      {
        onSuccess: (result) => {
          setLiked(result.liked)
          setLikeCount(result.likeCount)
          // 저장되며 새로 발급된 id를 올려보내야 다음 클릭이 같은 보드를 또 저장하지 않는다.
          if (boardId === null) {
            onSaved?.(result.boardId)
          }
        },
      },
    )
  }

  return (
    <button
      className={`like-button ${liked ? 'like-button--on' : ''}`}
      type="button"
      onClick={handleClick}
      disabled={like.isPending}
      aria-pressed={liked}
      aria-label={liked ? '좋아요 취소' : '좋아요'}
    >
      <span aria-hidden="true">{liked ? '♥' : '♡'}</span>
      <span>{likeCount.toLocaleString()}</span>
    </button>
  )
}
