import type { CSSProperties } from 'react'
import type { ContentSummary } from '../../../shared/types/content'
import { ContentArtwork } from './ContentArtwork'

/**
 * 보드 1개는 콘텐츠 8건 고정이라 12칸 배치를 쓰면 뒤쪽 4칸이 늘 비어서
 * 우하단이 휑하게 보인다. 8건 전용으로 2행 x 4열을 잡고 폭을 키워 캔버스를 채운다.
 *
 * 치수 근거: .board-collage는 aspect-ratio 20/21, .artwork는 3/4라서
 * 슬롯 높이(%) = 폭(%) x (4/3) / 1.05 = 폭 x 약 1.27.
 * 폭 34%면 높이 43%라 2행이 딱 들어간다. 3행을 유지했다면 폭을 21% 이상 못 키운다.
 * 가로로는 4장 x 34% = 136%가 되어 자연스럽게 겹치면서 콜라주 느낌이 유지된다.
 */
const SLOTS_8 = [
  { left: 0, top: 5, width: 34, rotate: -5, zIndex: 1 },
  { left: 22, top: 1, width: 35, rotate: 4, zIndex: 3 },
  { left: 44, top: 4, width: 34, rotate: -2, zIndex: 2 },
  { left: 66, top: 7, width: 33, rotate: 6, zIndex: 1 },
  { left: 1, top: 52, width: 34, rotate: 5, zIndex: 2 },
  { left: 23, top: 49, width: 35, rotate: -4, zIndex: 4 },
  { left: 45, top: 53, width: 34, rotate: 3, zIndex: 3 },
  { left: 66, top: 50, width: 33, rotate: -6, zIndex: 2 },
]

/** '오늘의 추천 보드'는 콘텐츠를 12건까지 받으므로 기존 3행 배치를 그대로 쓴다. */
const SLOTS_12 = [
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
  /** 넘기면 포스터가 버튼이 되어 콘텐츠 상세를 열 수 있다. */
  onContentSelect?: (content: ContentSummary) => void
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
  onContentSelect,
}: BoardCollageProps) {
  // 8건 이하면 캔버스를 꽉 채우는 2행 배치, 그 이상이면 3행 배치를 쓴다.
  const slots = contents.length <= SLOTS_8.length ? SLOTS_8 : SLOTS_12

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
            {/* figcaption은 figure의 직계 자식이어야 하므로 포스터만 버튼으로 감싼다. */}
            {onContentSelect ? (
              <button
                className="collage-item__button"
                type="button"
                onClick={() => onContentSelect(content)}
                aria-label={`${content.title || '제목 미상'} 상세 보기`}
              >
                <ContentArtwork content={content} />
              </button>
            ) : (
              <ContentArtwork content={content} />
            )}
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
