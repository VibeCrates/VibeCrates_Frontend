export interface ApiResponse<T> {
  success: boolean
  data: T
  message: string
}

export interface AccessTokenResponse {
  accessToken: string
}

/**
 * 무한 스크롤용 페이지 응답. 백엔드 PageResponse와 같은 모양이다.
 *
 * 전체 건수가 없는 것은 의도다. 서버가 요청보다 한 건 더 조회해 hasNext만 판정하므로
 * count 쿼리가 아예 돌지 않는다.
 */
export interface PageResponse<T> {
  content: T[]
  /** 0부터 시작하는 현재 페이지 번호 */
  page: number
  /** 요청한 페이지 크기. content.length는 마지막 페이지에서 이보다 작다. */
  size: number
  hasNext: boolean
}
