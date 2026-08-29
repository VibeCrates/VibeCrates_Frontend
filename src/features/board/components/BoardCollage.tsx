import type { CSSProperties } from 'react'
import type { ContentSummary } from '../../../shared/types/content'
import { ContentArtwork } from './ContentArtwork'

const slots = [
  { left: 3, top: 7, width: 20, rotate: -7, zIndex: 1 },
  { left: 16, top: 3, width: 20, rotate: 5, zIndex: 2 },
  { left: 37, top: 6, width: 29, rotate: -1, zIndex: 3 },
  { left: 70, top: 8, width: 26, rotate: 3, zIndex: 2 },
  { left: 2, top: 40, width: 17, rotate: -4, zIndex: 2 },
  { left: 14, top: 43, width: 17, rotate: 6, zIndex: 3 },
  { left: 75, top: 41, width: 19, rotate: -4, zIndex: 3 },
  { left: 4, top: 65, width: 18, rotate: -5, zIndex: 1 },
  { left: 17, top: 68, width: 18, rotate: 5, zIndex: 2 },
  { left: 38, top: 63, width: 17, rotate: -3, zIndex: 1 },
  { left: 53, top: 61, width: 17, rotate: 4, zIndex: 2 },
  { left: 74, top: 67, width: 21, rotate: -2, zIndex: 2 },
]

interface BoardCollageProps {
  contents: ContentSummary[]
  interactive?: boolean
  className?: string
}

function getDomainLabel(contentType: string) {
  const normalized = contentType.toUpperCase()
  if (normalized === 'MOVIE') return 'Movie'
  if (normalized === 'MUSIC') return 'Music'
  if (normalized === 'BOOK') return 'Book'
  return contentType
}

export function BoardCollage({
  contents,
  interactive = true,
  className = '',
}: BoardCollageProps) {
  return (
    <div
      className={`board-collage ${interactive ? 'board-collage--interactive' : 'board-collage--thumbnail'} ${className}`}
      aria-label={`${contents.length}개의 콘텐츠로 구성된 보드`}
    >
      {contents.slice(0, slots.length).map((content, index) => {
        const slot = slots[index]
        const style = {
          '--slot-left': `${slot.left}%`,
          '--slot-top': `${slot.top}%`,
          '--slot-width': `${slot.width}%`,
          '--slot-rotate': `${slot.rotate}deg`,
          '--slot-z': slot.zIndex,
        } as CSSProperties

        return (
          <figure
            className="collage-item"
            key={`${content.id}-${index}`}
            style={style}
          >
            <ContentArtwork content={content} />
            {interactive && (
              <figcaption className="collage-item__details">
                <span className={`domain-pill domain-pill--${content.contentType.toLowerCase()}`}>
                  {getDomainLabel(content.contentType)}
                </span>
                <strong>{content.title || '제목 미상'}</strong>
                <span>{content.releaseYear ?? '연도 미상'}</span>
              </figcaption>
            )}
          </figure>
        )
      })}
      {contents.length === 0 && (
        <div className="board-collage__empty">
          <span>EMPTY CRATE</span>
          <p>아직 담긴 콘텐츠가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
