import { useState } from 'react'
import { isDeletedBoardError, useBoardLike } from '../model/boardQueries'
import type { BoardLikeMode } from '../model/boardQueries'
import type { BoardLikeResult } from '../api/boardApi'

interface BoardLikeButtonProps {
  /** DB에 저장된 보드면 id, "오늘의 추천 보드"처럼 아직 저장 전이면 null. */
  boardId: number | null
  /** 좋아요를 어떤 경로로 보낼지. 화면마다 다르다(BoardLikeMode). */
  mode: BoardLikeMode
  initialLiked?: boolean
  initialLikeCount?: number
  /** 주인이 지운 보드. 좋아요를 취소하면 다시 담을 수 없어 취소 전에 한 번 묻는다. */
  deleted?: boolean
  /**
   * 좋아요/취소가 성공할 때마다 서버가 돌려준 최신 상태를 올려보낸다.
   * 부모는 이걸로 새로 발급된 boardId를 기억하거나 캐시를 맞춘다.
   */
  onLikeResult?: (result: BoardLikeResult) => void
  /** 좋아요가 실패했을 때 사용자에게 보여줄 문구. 버튼에는 문구를 둘 자리가 없어 부모가 띄운다. */
  onLikeError?: (message: string) => void
}

export function BoardLikeButton({
  boardId: initialBoardId,
  mode,
  initialLiked = false,
  initialLikeCount = 0,
  deleted = false,
  onLikeResult,
  onLikeError,
}: BoardLikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  // 저장 전 보드는 첫 좋아요에서 id가 생긴다. 부모가 새 값을 다시 넘겨주기 전에도 다음 클릭이
  // 취소로 이어지도록 버튼이 직접 기억한다. 취소로 보드가 지워지면 null로 돌아간다.
  const [boardId, setBoardId] = useState(initialBoardId)
  const like = useBoardLike()

  function handleClick() {
    // 서버도 멱등하게 처리하지만, 연타로 요청 자체가 쌓이지 않도록 진행 중에는 프론트에서 먼저 막는다.
    if (like.isPending) {
      return
    }
    if (
      liked &&
      deleted &&
      !window.confirm('만든 사람이 삭제한 보드예요. 좋아요를 취소하면 다시 담을 수 없어요. 취소할까요?')
    ) {
      return
    }

    like.mutate(
      { boardId, liked, mode },
      {
        onSuccess: (result) => {
          setLiked(result.liked)
          setLikeCount(result.likeCount)
          setBoardId(result.boardId)
          // 저장되며 새로 발급된 id를 올려보내야 부모가 들고 있는 캐시도 최신 상태로 유지된다.
          onLikeResult?.(result)
        },
        onError: (error) => {
          onLikeError?.(
            isDeletedBoardError(error)
              ? '삭제된 보드라 좋아요할 수 없어요.'
              : error instanceof Error
                ? error.message
                : '좋아요를 저장하지 못했어요.',
          )
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
