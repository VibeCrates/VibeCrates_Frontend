import { apiRequest } from '../../../shared/api'

export function requestSearchVector(keyword: string): Promise<void> {
  return apiRequest(`/api/search/vector?keyword=${encodeURIComponent(keyword)}`)
}
