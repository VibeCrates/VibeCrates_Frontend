/** 백엔드 Content 엔티티의 DTYPE(@DiscriminatorValue)과 1:1로 대응한다. */
export const CONTENT_TYPES = ['BOOK', 'MOVIE', 'MUSIC'] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export interface ContentSummary {
  id: number
  title: string | null
  imageUrl: string | null
  contentType: ContentType
  releaseYear: number | null
}

export interface BookDetail {
  author: string | null
  publisher: string | null
  plot: string | null
}

export interface MovieDetail {
  runningTime: number | null
  director: string[] | null
  actor: string[] | null
  plot: string | null
}

export interface MusicDetail {
  artist: string[] | null
  plot: string | null
}

/** DTYPE별 상세 응답 매핑. 백엔드 ContentDetailResponse 구현체와 대응한다. */
export interface ContentDetailByType {
  BOOK: BookDetail
  MOVIE: MovieDetail
  MUSIC: MusicDetail
}

export type ContentDetail = ContentDetailByType[ContentType]
