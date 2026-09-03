import { useQuery } from '@tanstack/react-query'
import { getSearchBoard } from '../api/searchApi'

/**
 * 검색어별로 캐시된다. 서버가 같은 검색어에 같은 보드를 돌려주므로
 * 뒤로 가기로 이전 검색어에 돌아왔을 때 재조회 없이 즉시 그려진다.
 */
export function useSearchBoard(keyword: string, enabled: boolean) {
  return useQuery({
    queryKey: ['search', 'board', keyword],
    queryFn: () => getSearchBoard(keyword),
    enabled: enabled && keyword.length > 0,
  })
}
