import { Link } from 'react-router'
import type { BoardWithContents } from '../../../shared/types/board'
import { BoardCollage } from './BoardCollage'

interface BoardTileProps {
  board: BoardWithContents
}

export function BoardTile({ board }: BoardTileProps) {
  return (
    <Link
      className="board-tile"
      to={`/boards/${board.boardId}`}
      aria-label={`${board.title || '제목 없는 보드'} 보드 열기`}
    >
      <div className="board-tile__canvas">
        <BoardCollage contents={board.contents} interactive={false} />
      </div>
      <div className="board-tile__meta">
        <h3>{board.title || '제목 없는 보드'}</h3>
        <span>{board.likeCount.toLocaleString()} saves</span>
      </div>
    </Link>
  )
}
