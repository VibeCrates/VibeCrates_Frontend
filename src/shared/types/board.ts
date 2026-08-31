import type { ContentSummary } from './content'

export interface BoardWithContents {
  boardId: number
  title: string | null
  likeCount: number
  /** 조회한 사용자가 이 보드에 좋아요를 눌렀는지. likeCount(전체 집계)와는 출처가 다르다. */
  liked: boolean
  contents: ContentSummary[]
}
