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
  /**
   * 주인이 지운 보드인지. 좋아요한 사람의 보관함에만 보이고, 새 좋아요를 받지 않는다.
   * 그래서 좋아요를 취소하면 다시 담을 수 없다. 검색 결과 보드에는 없는 값이다.
   */
  deleted?: boolean
  /** 조회한 사용자가 만든 보드인지. 주인만 보드를 지울 수 있다. 검색 결과 보드에는 없는 값이다. */
  owned?: boolean
  contents: ContentSummary[]
}

/**
 * 검색 결과 보드. 제목은 검색어이고, 좋아요할 때 보낼 서버 서명(likeToken)이 붙어 있다.
 *
 * 좋아요는 boardId가 있어도 항상 이 토큰으로 보낸다. 서버가 토큰 안의 검색어·콘텐츠로
 * "있으면 좋아요, 없으면 저장 후 좋아요"를 처리하므로, 그 사이 보드가 지워졌어도 실패하지 않는다.
 */
export interface SearchBoard extends BoardWithContents {
  likeToken: string
}
