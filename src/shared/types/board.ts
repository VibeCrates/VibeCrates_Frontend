import type { ContentSummary } from './content'

export interface BoardWithContents {
  boardId: number
  title: string | null
  likeCount: number
  contents: ContentSummary[]
}
