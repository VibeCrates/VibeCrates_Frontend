export interface ContentSummary {
  id: number
  title: string | null
  imageUrl: string | null
  contentType: 'BOOK' | 'MOVIE' | 'MUSIC' | string
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

export type ContentDetail = BookDetail | MovieDetail | MusicDetail
