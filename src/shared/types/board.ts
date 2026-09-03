import type { ContentSummary } from './content'

/**
 * 보드 하나에 담기는 콘텐츠 수. 백엔드 Board.ITEMS_PER_BOARD와 같은 값이고,
 * 좋아요로 저장될 때 서버가 이 개수를 검증한다.
 */
export const BOARD_CONTENT_COUNT = 8

export interface BoardWithContents {
  /**
   * 아직 저장되지 않은 보드(검색 결과 보드, 오늘의 추천 보드)는 null이다.
   * null이면 좋아요가 저장까지 함께 수행하고 새 id를 돌려준다.
   */
  boardId: number | null
  title: string | null
  likeCount: number
  /** 조회한 사용자가 이 보드에 좋아요를 눌렀는지. likeCount(전체 집계)와는 출처가 다르다. */
  liked: boolean
  contents: ContentSummary[]
}
