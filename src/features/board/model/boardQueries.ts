import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createBoard,
  getLikedBoards,
  getMyBoards,
  getRecommendedBoards,
  likeBoard,
  likeNewBoard,
  unlikeBoard,
  updateBoard,
} from '../api/boardApi'
import type { BoardLikeResult, BoardSaveInput, MyBoardFilter } from '../api/boardApi'
import type { BoardWithContents } from '../../../shared/types/board'

const POPULAR_BOARD_COUNT = 8

/** 인기 보드 캐시 키. 보드를 수정한 뒤 목록을 맞추려면 밖에서도 필요하다. */
export const POPULAR_BOARDS_KEY = ['boards', 'popular', POPULAR_BOARD_COUNT] as const

const MY_BOARD_COUNT = 8

/**
 * 내 보드 캐시 키의 공통 앞부분.
 *
 * 홈 섹션과 보관함 세 탭이 모두 이 아래에 달린다. 좋아요 한 번으로 네 목록의 구성이 전부
 * 바뀌므로, 무효화는 개별 키가 아니라 이 접두사로 걸어야 한 곳만 갱신되고 나머지가
 * 옛 목록에 머무는 일이 생기지 않는다.
 */
export const MY_BOARDS_PREFIX = ['boards', 'mine'] as const

/** 홈 "내 보드" 섹션 캐시 키. 보관함 전체 탭의 첫 페이지와 같은 것을 본다. */
export const MY_BOARDS_KEY = [...MY_BOARDS_PREFIX, 'home', MY_BOARD_COUNT] as const

/**
 * 홈 "내 보드" 섹션. 첫 페이지만 필요해서 무한 스크롤을 쓰지 않는다.
 *
 * select로 content만 꺼내 배열로 돌려준다. 이 섹션은 페이지 정보를 쓸 일이 없어
 * 화면이 PageResponse를 알 이유가 없다.
 */
export function useMyBoards(enabled: boolean) {
  return useQuery({
    queryKey: MY_BOARDS_KEY,
    queryFn: () => getMyBoards({ filter: 'ALL', page: 0, size: MY_BOARD_COUNT }),
    select: (page) => page.content,
    enabled,
  })
}

/**
 * 보관함 한 페이지에 담을 보드 수.
 *
 * 한 화면을 두세 배 채우는 크기다. 더 작으면 스크롤을 조금만 내려도 요청이 계속 나가고,
 * 더 크면 대부분 보지 않을 데이터 때문에 첫 화면이 늦어진다. 보드 1건에 콘텐츠 8건이
 * 딸려 오므로 20이면 이미 콘텐츠 160건이다. (서버 상한은 50)
 */
export const ARCHIVE_PAGE_SIZE = 20

export const archiveBoardsKey = (filter: MyBoardFilter) =>
  [...MY_BOARDS_PREFIX, 'archive', filter] as const

/**
 * 보관함 탭 하나. 스크롤이 바닥에 닿을 때마다 다음 페이지를 이어 붙인다.
 *
 * 탭이 캐시 키에 들어가야 한다. 빠뜨리면 탭을 옮겨도 이전 탭의 목록이 그대로 보이다가
 * 뒤늦게 바뀐다.
 */
export function useArchiveBoards(filter: MyBoardFilter, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: archiveBoardsKey(filter),
    queryFn: ({ pageParam }) =>
      getMyBoards({ filter, page: pageParam, size: ARCHIVE_PAGE_SIZE }),
    initialPageParam: 0,
    // hasNext가 false면 undefined를 돌려줘야 react-query가 "끝"으로 인식한다.
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    enabled,
  })
}

/** 오늘의 추천 보드 캐시 키. 좋아요 후 캐시를 직접 갱신해야 해서 밖으로 노출한다. */
export const RECOMMENDED_BOARDS_KEY = ['boards', 'recommended'] as const

export function useRecommendedBoards(enabled: boolean) {
  return useQuery({
    queryKey: RECOMMENDED_BOARDS_KEY,
    queryFn: getRecommendedBoards,
    enabled,
  })
}

export function usePopularBoards(enabled: boolean) {
  return useQuery({
    queryKey: ['boards', 'popular', POPULAR_BOARD_COUNT],
    queryFn: () => getLikedBoards(POPULAR_BOARD_COUNT),
    enabled,
  })
}


/**
 * 보드 저장. 제목 변경·콘텐츠 교체·순서 변경이 모두 이 하나로 처리된다.
 *
 * boardId가 null이면(아직 저장 전인 추천/검색 보드) 고칠 원본이 서버에 없으므로 생성한다.
 * 저장된 보드라도 내 것이 아니면 서버가 복제본을 만들어 돌려주므로, 응답 보드는 요청한 것과
 * 다른 id일 수 있다. 어느 목록의 캐시를 갱신할지는 호출하는 화면이 판단해야 해서 여기서는 손대지 않는다.
 */
export function useSaveBoard() {
  return useMutation({
    mutationFn: (input: BoardSaveInput & { boardId: number | null }) => {
      const { boardId, ...body } = input
      return boardId === null ? createBoard(body) : updateBoard(boardId, body)
    },
  })
}

/**
 * 보드 좋아요/취소. 이미 저장된 보드는 boardId로, DB에 없는 보드는 제목·콘텐츠로 저장까지 함께 요청한다.
 * 성공하면 인기 보드 캐시의 좋아요 수를 갱신해 타일 표시가 즉시 맞춰진다.
 */
export function useBoardLike() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: {
      boardId: number | null
      liked: boolean
      title: string
      contentIds: number[]
    }): Promise<BoardLikeResult> => {
      if (input.boardId === null) {
        return likeNewBoard(input.title, input.contentIds)
      }
      return input.liked ? unlikeBoard(input.boardId) : likeBoard(input.boardId)
    },
    onSuccess: (result) => {
      queryClient.setQueryData<BoardWithContents[]>(
        POPULAR_BOARDS_KEY,
        (boards) =>
          boards?.map((board) =>
            board.boardId === result.boardId
              ? { ...board, likeCount: result.likeCount, liked: result.liked }
              : board,
          ),
      )
    },
  })
}
