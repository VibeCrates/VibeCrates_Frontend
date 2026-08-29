import { apiRequest } from '../../../shared/api'
import type {
  ContentDetailByType,
  ContentSummary,
  ContentType,
} from '../../../shared/types/content'

export function getContentSummary(contentId: number): Promise<ContentSummary> {
  return apiRequest(`/api/contents/${encodeURIComponent(contentId)}`)
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
