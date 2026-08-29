import { Link } from 'react-router'
import type { BoardWithContents } from '../../../shared/types/board'
import { BoardCollage } from './BoardCollage'

interface BoardTileProps {
  board: BoardWithContents
  index: number
}

export function BoardTile({ board, index }: BoardTileProps) {
  return (
    <Link
      className="board-tile"
      to={`/boards/${board.boardId}`}
      aria-label={`${board.title || '제목 없는 보드'} 보드 열기`}
      style={{ '--tile-delay': `${Math.min(index, 8) * 45}ms` } as React.CSSProperties}
    >
      <div className="board-tile__canvas">
        <BoardCollage contents={board.contents} interactive={false} />
        <span className="board-tile__open">열기 ↗</span>
      </div>
      <div className="board-tile__meta">
        <h3>{board.title || '제목 없는 보드'}</h3>
        <span>{board.likeCount.toLocaleString()} saves</span>
      </div>
    </Link>
  )
}
