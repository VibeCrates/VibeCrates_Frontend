import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBoard,
  getLikedBoards,
  getMyBoards,
  getRecommendedBoards,
  likeBoard,
  likeNewBoard,
  unlikeBoard,
  updateBoard,
} from '../api/boardApi'
import type { BoardLikeResult, BoardSaveInput } from '../api/boardApi'
import type { BoardWithContents } from '../../../shared/types/board'

const POPULAR_BOARD_COUNT = 8

/** 인기 보드 캐시 키. 보드를 수정한 뒤 목록을 맞추려면 밖에서도 필요하다. */
export const POPULAR_BOARDS_KEY = ['boards', 'popular', POPULAR_BOARD_COUNT] as const

const MY_BOARD_COUNT = 8

/** 내 보드 캐시 키. 보드를 만들거나 고치면 목록이 바뀌므로 밖에서 무효화한다. */
export const MY_BOARDS_KEY = ['boards', 'mine', MY_BOARD_COUNT] as const

export function useMyBoards(enabled: boolean) {
  return useQuery({
    queryKey: MY_BOARDS_KEY,
    queryFn: () => getMyBoards(MY_BOARD_COUNT),
    enabled,
  })
}

/** 오늘의 추천 보드 캐시 키. 좋아요 후 캐시를 직접 갱신해야 해서 밖으로 노출한다. */
export const RECOMMENDED_BOARDS_KEY = ['boards', 'recommended'] as const

export function useRecommendedBoards(enabled: boolean) {
  return useQuery({
    queryKey: RECOMMENDED_BOARDS_KEY,
    queryFn: getRecommendedBoards,
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
 * 보드 저장. 제목 변경·콘텐츠 교체·순서 변경이 모두 이 하나로 처리된다.
 *
 * boardId가 null이면(아직 저장 전인 추천/검색 보드) 고칠 원본이 서버에 없으므로 생성한다.
 * 저장된 보드라도 내 것이 아니면 서버가 복제본을 만들어 돌려주므로, 응답 보드는 요청한 것과
 * 다른 id일 수 있다. 어느 목록의 캐시를 갱신할지는 호출하는 화면이 판단해야 해서 여기서는 손대지 않는다.
 */
export function useSaveBoard() {
  return useMutation({
    mutationFn: (input: BoardSaveInput & { boardId: number | null }) => {
      const { boardId, ...body } = input
      return boardId === null ? createBoard(body) : updateBoard(boardId, body)
    },
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
        POPULAR_BOARDS_KEY,
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
