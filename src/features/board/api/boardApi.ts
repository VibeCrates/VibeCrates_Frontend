import { apiRequest } from '../../../shared/api'
import type { PageResponse } from '../../../shared/types/api'
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
 * 보관함 탭. 백엔드 MyBoardFilter와 같은 값이어야 한다.
 *
 * 세 값은 서로 배타적이지 않다. 좋아요한 보드를 고치면 복제본이 내 보드가 되고, 내가 만든
 * 보드에 내가 좋아요를 누를 수도 있어서 LIKED와 CREATED에 동시에 속하는 보드가 정상적으로
 * 존재한다. 각 목록은 "이 조건을 만족하는 보드 전부"라는 뜻이지 나눠 가진 몫이 아니다.
 */
export type MyBoardFilter = 'ALL' | 'LIKED' | 'CREATED'

export interface MyBoardsQuery {
  filter: MyBoardFilter
  /** 0부터 시작한다. */
  page: number
  /** 서버 상한은 50이다. 그 이상은 400으로 거절된다. */
  size: number
}

/**
 * 내 보드 — 탭별로 한 페이지씩.
 *
 * 이 서비스에서 좋아요는 사실상 "내 크레이트에 담기"라, ALL은 내가 만든 보드와 좋아요한
 * 보드를 합쳐서 준다. 홈의 "내 보드" 섹션이 보는 것이 곧 ALL의 첫 페이지다.
 *
 * 정렬은 좋아요 수가 아니라 "보관함에 담은 시각"의 최신순이다. like_count는 다른 사용자들의
 * 좋아요로 계속 변해서, 그걸로 정렬하면 다음 페이지를 불러오는 사이에 순서가 뒤바뀌어
 * 같은 보드가 두 번 오거나 누락된다.
 */
export function getMyBoards(query: MyBoardsQuery): Promise<PageResponse<BoardWithContents>> {
  const params = new URLSearchParams({
    filter: query.filter,
    page: String(query.page),
    size: String(query.size),
  })

  return apiRequest(`/api/boards/mine?${params.toString()}`)
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
