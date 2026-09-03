import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { MIN_SEARCH_LENGTH, getContentDetail, searchContents } from '../api/contentApi'
import type {
  ContentDetail,
  ContentSummary,
  ContentType,
} from '../../../shared/types/content'

const SEARCH_PAGE_SIZE = 20

/**
 * 제목으로 콘텐츠를 검색한다. 보드 수정 화면에서 교체할 콘텐츠를 고를 때 쓴다.
 *
 * 검색어가 최소 길이에 못 미치면 아예 요청하지 않는다. 서버도 같은 값으로 거절하지만,
 * 한 글자만 쳐도 400이 날아가는 건 낭비다.
 *
 * 마지막 페이지 판별은 "받아온 개수가 요청한 크기보다 적으면 끝"으로 한다.
 * 서버가 전체 개수를 세지 않으므로(count 쿼리를 한 번 더 돌 이유가 없다) 이 방식이 맞다.
 */
export function useContentSearch(keyword: string) {
  const trimmed = keyword.trim()

  return useInfiniteQuery<ContentSummary[]>({
    queryKey: ['contents', 'search', trimmed],
    queryFn: ({ pageParam }) => searchContents(trimmed, pageParam as number, SEARCH_PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < SEARCH_PAGE_SIZE ? undefined : allPages.length,
    enabled: trimmed.length >= MIN_SEARCH_LENGTH,
    staleTime: 60_000,
  })
}

/**
 * 콘텐츠 상세(감독/저자/가사 등)를 조회한다.
 *
 * 요약 정보(id·제목·포스터·연도)는 보드를 받을 때 이미 캐시에 있으므로 여기서 받지 않는다.
 * 서브타입 필드만 내려오고, 어떤 타입인지는 요청한 contentType으로 판별한다.
 */
export function useContentDetail(
  contentType: ContentType | null,
  contentId: number | null,
) {
  return useQuery<ContentDetail>({
    queryKey: ['contents', 'detail', contentType, contentId],
    queryFn: () => getContentDetail(contentType as ContentType, contentId as number),
    enabled: contentType !== null && contentId !== null,
    // 콘텐츠 상세는 사실상 불변이라 모달을 여닫을 때마다 다시 부를 이유가 없다.
    staleTime: 5 * 60_000,
  })
}
