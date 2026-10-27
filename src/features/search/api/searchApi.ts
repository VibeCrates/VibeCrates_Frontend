import { apiRequest } from '../../../shared/api'
import type { SearchBoard } from '../../../shared/types/board'

/**
 * 검색어와 벡터가 유사한 콘텐츠를 모은 보드를 받아온다. 제목은 검색어다.
 *
 * 같은 제목·구성의 검색 보드가 저장돼 있지 않으면 boardId가 null이고,
 * 사용자가 좋아요를 누르는 순간 likeToken으로 저장된다(likeSearchBoard).
 */
export function getSearchBoard(keyword: string): Promise<SearchBoard> {
  return apiRequest(`/api/search/board?keyword=${encodeURIComponent(keyword)}`)
}
