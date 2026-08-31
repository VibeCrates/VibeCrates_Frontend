import { useQuery } from '@tanstack/react-query'
import { getContentDetail } from '../api/contentApi'
import type { ContentDetail, ContentType } from '../../../shared/types/content'

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
