import { apiRequest } from '../../../shared/api'
import type {
  ContentDetailByType,
  ContentSummary,
  ContentType,
} from '../../../shared/types/content'

export function getContentSummary(contentId: number): Promise<ContentSummary> {
  return apiRequest(`/api/contents/${encodeURIComponent(contentId)}`)
}

/** 검색어 최소 길이. 서버도 같은 값을 강제한다 — pg_trgm 인덱스가 3글자 단위라 그보다 짧으면 전체 스캔이 된다. */
export const MIN_SEARCH_LENGTH = 3

export function searchContents(
  keyword: string,
  page: number,
  size: number,
): Promise<ContentSummary[]> {
  const params = new URLSearchParams({
    keyword,
    page: String(page),
    size: String(size),
  })
  return apiRequest(`/api/contents/search?${params}`)
}

// contentType으로 반환 타입이 좁혀지므로 호출부에서 별도 분기 없이 상세 필드를 쓸 수 있다.
export function getContentDetail<T extends ContentType>(
  contentType: T,
  contentId: number,
): Promise<ContentDetailByType[T]> {
  return apiRequest(
    `/api/contents/${encodeURIComponent(contentType)}/${encodeURIComponent(contentId)}`,
  )
}
