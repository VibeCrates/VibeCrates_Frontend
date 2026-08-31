import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getLikedBoards,
  getRecommendedContents,
  likeBoard,
  likeNewBoard,
  unlikeBoard,
} from '../api/boardApi'
import type { BoardLikeResult } from '../api/boardApi'
import type { BoardWithContents } from '../../../shared/types/board'

// 보드 하나에 담기는 콘텐츠 수는 8건 고정이다. 좋아요로 저장될 때 서버도 이 값을 검증한다.
const RECOMMENDED_CONTENT_COUNT = 8
const POPULAR_BOARD_COUNT = 8

export function useRecommendedContents(enabled: boolean) {
  return useQuery({
    queryKey: ['contents', 'recommended', RECOMMENDED_CONTENT_COUNT],
    queryFn: () => getRecommendedContents(RECOMMENDED_CONTENT_COUNT),
    enabled,
  })
}

export function usePopularBoards(enabled: boolean) {
  return useQuery({
    queryKey: ['boards', 'popular', POPULAR_BOARD_COUNT],
    queryFn: () => getLikedBoards(POPULAR_BOARD_COUNT),
    enabled,
  })
}


/**
 * 보드 좋아요/취소. 이미 저장된 보드는 boardId로, DB에 없는 보드는 제목·콘텐츠로 저장까지 함께 요청한다.
 * 성공하면 인기 보드 캐시의 좋아요 수를 갱신해 타일 표시가 즉시 맞춰진다.
 */
export function useBoardLike() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      boardId: number | null
      liked: boolean
      title: string
      contentIds: number[]
    }): Promise<BoardLikeResult> => {
      if (input.boardId === null) {
        return likeNewBoard(input.title, input.contentIds)
      }
      return input.liked ? unlikeBoard(input.boardId) : likeBoard(input.boardId)
    },
    onSuccess: (result) => {
      queryClient.setQueryData<BoardWithContents[]>(
        ['boards', 'popular', POPULAR_BOARD_COUNT],
        (boards) =>
          boards?.map((board) =>
            board.boardId === result.boardId
              ? { ...board, likeCount: result.likeCount, liked: result.liked }
              : board,
          ),
      )
    },
  })
}
