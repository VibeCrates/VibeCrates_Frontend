import { apiRequest } from '../../../shared/api'
import type {
  ContentDetail,
  ContentSummary,
} from '../../../shared/types/content'

export function getContentSummary(contentId: number): Promise<ContentSummary> {
  return apiRequest(`/api/contents/${encodeURIComponent(contentId)}`)
}

export function getContentDetail<T extends ContentDetail = ContentDetail>(
  contentType: string,
  contentId: number,
): Promise<T> {
  return apiRequest(
    `/api/contents/${encodeURIComponent(contentType)}/${encodeURIComponent(contentId)}`,
  )
}
