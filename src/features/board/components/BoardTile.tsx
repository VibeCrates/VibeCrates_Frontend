import type { BoardWithContents } from '../../../shared/types/board'
import { BoardCollage } from './BoardCollage'

interface BoardTileProps {
  board: BoardWithContents
  onOpen: (board: BoardWithContents) => void
}

export function BoardTile({ board, onOpen }: BoardTileProps) {
  return (
    // 페이지 이동이 아니라 같은 화면에서 확대하므로 링크가 아닌 버튼이다.
    // 캐러셀을 드래그해 밀었을 때 발생하는 click은 useDragScroll이 캡처 단계에서 삼킨다.
    <button
      className="board-tile"
      type="button"
      onClick={() => onOpen(board)}
      aria-label={`${board.title || '제목 없는 보드'} 보드 열기`}
    >
      <div className="board-tile__canvas">
        <BoardCollage contents={board.contents} interactive={false} />
      </div>
      <div className="board-tile__meta">
        <h3>{board.title || '제목 없는 보드'}</h3>
        <span>
          {/* 만든 사람이 지운 보드. 좋아요한 사람의 보관함에만 남아 있다. */}
          {board.deleted ? '삭제된 보드 · ' : ''}좋아요 {board.likeCount.toLocaleString()}
        </span>
      </div>
    </button>
  )
}
