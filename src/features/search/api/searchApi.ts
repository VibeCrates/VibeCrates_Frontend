import { apiRequest } from '../../../shared/api'
import type { BoardWithContents } from '../../../shared/types/board'

/**
 * 검색어와 벡터가 유사한 콘텐츠를 모은 보드를 받아온다.
 *
 * 아직 DB에 저장되지 않은 보드라 응답의 boardId는 null이고,
 * 사용자가 좋아요를 누르는 순간 POST /api/boards/likes로 저장된다.
 */
export function getSearchBoard(keyword: string): Promise<BoardWithContents> {
  return apiRequest(`/api/search/board?keyword=${encodeURIComponent(keyword)}`)
}
