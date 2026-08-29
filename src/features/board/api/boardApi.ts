import { apiRequest } from '../../../shared/api'
import type { BoardWithContents } from '../../../shared/types/board'
import type { ContentSummary } from '../../../shared/types/content'

export function getBoard(boardId: number): Promise<BoardWithContents> {
  return apiRequest(`/api/boards/list?boardId=${encodeURIComponent(boardId)}`)
}

export function getRecommendedContents(count: number): Promise<ContentSummary[]> {
  return apiRequest(`/api/boards/recommendation/user?n=${encodeURIComponent(count)}`)
}

export function getLikedBoards(count: number): Promise<BoardWithContents[]> {
  return apiRequest(`/api/boards/liked?n=${encodeURIComponent(count)}`)
}
