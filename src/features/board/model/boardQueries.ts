import { useQuery } from '@tanstack/react-query'
import {
  getBoard,
  getLikedBoards,
  getRecommendedContents,
} from '../api/boardApi'

const RECOMMENDED_CONTENT_COUNT = 12
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

export function useBoard(boardId: number | null, enabled: boolean) {
  return useQuery({
    queryKey: ['boards', 'detail', boardId],
    queryFn: () => getBoard(boardId as number),
    enabled: enabled && boardId !== null,
  })
}
