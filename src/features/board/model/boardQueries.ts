import { useQuery } from '@tanstack/react-query'
import {
  getBoard,
  getLikedBoards,
  getRecommendedContents,
} from '../api/boardApi'

export function useRecommendedContents(enabled: boolean) {
  return useQuery({
    queryKey: ['contents', 'recommended', 12],
    queryFn: () => getRecommendedContents(12),
    enabled,
  })
}

export function usePopularBoards(enabled: boolean) {
  return useQuery({
    queryKey: ['boards', 'popular', 8],
    queryFn: () => getLikedBoards(8),
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
