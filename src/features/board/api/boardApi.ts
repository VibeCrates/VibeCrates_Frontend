import { apiRequest } from '../../../shared/api'
import type { BoardWithContents } from '../../../shared/types/board'
import type { ContentSummary } from '../../../shared/types/content'

export function getRecommendedContents(count: number): Promise<ContentSummary[]> {
  return apiRequest(`/api/boards/recommendation/user?n=${encodeURIComponent(count)}`)
}

export function getLikedBoards(count: number): Promise<BoardWithContents[]> {
  return apiRequest(`/api/boards/liked?n=${encodeURIComponent(count)}`)
}

export interface BoardLikeResult {
  boardId: number
  likeCount: number
  liked: boolean
}

export function likeBoard(boardId: number): Promise<BoardLikeResult> {
  return apiRequest(`/api/boards/${encodeURIComponent(boardId)}/likes`, { method: 'POST' })
}

export function unlikeBoard(boardId: number): Promise<BoardLikeResult> {
  return apiRequest(`/api/boards/${encodeURIComponent(boardId)}/likes`, { method: 'DELETE' })
}

/** 아직 DB에 없는 보드(오늘의 추천 보드 / 검색 보드)에 좋아요. 저장까지 서버가 처리하고 boardId를 돌려준다. */
export function likeNewBoard(title: string, contentIds: number[]): Promise<BoardLikeResult> {
  return apiRequest('/api/boards/likes', {
    method: 'POST',
    body: JSON.stringify({ title, contentIds }),
  })
}
