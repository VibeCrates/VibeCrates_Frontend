/**
 * 검색 결과 페이지 경로.
 *
 * 검색어를 쿼리스트링에 두면 새로고침·공유·뒤로 가기가 그대로 동작하고,
 * 페이지가 자기 검색어를 URL에서 직접 읽으므로 이동시키는 쪽은 상태를 들고 있을 필요가 없다.
 */
export function buildSearchPath(keyword: string) {
  return `/search?keyword=${encodeURIComponent(keyword)}`
}
