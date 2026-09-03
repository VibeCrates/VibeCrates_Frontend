import { apiRequest } from '../../../shared/api'
import type { BoardWithContents } from '../../../shared/types/board'

/**
 * 사용자 취향 벡터 기반 "오늘의 추천 보드" 4개.
 *
 * 이미 좋아요를 눌러 저장한 보드라면 boardId와 좋아요 상태가 채워져 오므로,
 * 새로고침해도 하트가 빈 채로 그려지지 않는다.
 * 보드당 8건, 노출 개수 모두 서버가 정하므로 파라미터가 없다.
 */
export function getRecommendedBoards(): Promise<BoardWithContents[]> {
  return apiRequest('/api/boards/recommendation/user')
}

export function getLikedBoards(count: number): Promise<BoardWithContents[]> {
  return apiRequest(`/api/boards/liked?n=${encodeURIComponent(count)}`)
}

/**
 * 내 보드 — 내가 만든 보드와 내가 좋아요한 보드를 합쳐 좋아요 많은 순으로.
 *
 * 이 서비스에서 좋아요는 사실상 "내 크레이트에 담기"라, 두 경로를 한 곳에서 보여준다.
 */
export function getMyBoards(count: number): Promise<BoardWithContents[]> {
  return apiRequest(`/api/boards/mine?n=${encodeURIComponent(count)}`)
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

/** 보드의 최종 상태. 생성과 수정이 같은 모양을 쓴다. contentIds의 순서가 곧 배치 순서다. */
export interface BoardSaveInput {
  title: string
  contentIds: number[]
}

/** 아직 저장 전인 보드(추천/검색 보드)를 사용자가 고쳤을 때. 내 보드로 새로 만든다. */
export function createBoard(input: BoardSaveInput): Promise<BoardWithContents> {
  return apiRequest('/api/boards', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/**
 * 보드의 제목과 콘텐츠를 통째로 갱신한다. 제목 변경·콘텐츠 교체·순서 변경이 모두 이 요청 하나다.
 *
 * 내 보드가 아니면(추천 보드, 남이 만든 보드) 서버가 원본을 건드리지 않고 복제본을 만든다.
 * 그래서 응답의 boardId가 요청한 boardId와 다를 수 있고, 호출한 쪽은 반드시 이를 반영해야 한다.
 */
export function updateBoard(
  boardId: number,
  input: BoardSaveInput,
): Promise<BoardWithContents> {
  return apiRequest(`/api/boards/${encodeURIComponent(boardId)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

/** 아직 DB에 없는 보드(오늘의 추천 보드 / 검색 보드)에 좋아요. 저장까지 서버가 처리하고 boardId를 돌려준다. */
export function likeNewBoard(title: string, contentIds: number[]): Promise<BoardLikeResult> {
  return apiRequest('/api/boards/likes', {
    method: 'POST',
    body: JSON.stringify({ title, contentIds }),
  })
}
