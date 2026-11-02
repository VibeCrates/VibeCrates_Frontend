import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
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

/** 이만큼(px) 움직이기 전까지는 끌기가 아니라 클릭으로 본다. */
const DRAG_THRESHOLD = 4

/** 모서리에서 이 비율(포스터 짧은 변 기준) 안쪽을 누르면 옮기기 대신 회전한다. 최소 14px. */
const CORNER_RATIO = 0.2
const CORNER_MIN_PX = 14

interface Position {
  left: number
  top: number
}

/** 화면에 지금 보이는 회전각(도). 마우스를 올리면 기울기가 풀리므로 변수 값이 아니라 실제 transform을 읽는다. */
function visibleAngle(item: HTMLElement): number {
  const m = new DOMMatrixReadOnly(getComputedStyle(item).transform)
  return (Math.atan2(m.b, m.a) * 180) / Math.PI
}

/** 누른 점이 포스터의 네 모서리 근처인지. 회전된 포스터라 화면 좌표를 포스터 기준 좌표로 되돌려 잰다. */
function isCornerHit(item: HTMLElement, clientX: number, clientY: number): boolean {
  const rect = item.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const rad = (-visibleAngle(item) * Math.PI) / 180
  const dx = clientX - cx
  const dy = clientY - cy
  const lx = dx * Math.cos(rad) - dy * Math.sin(rad)
  const ly = dx * Math.sin(rad) + dy * Math.cos(rad)
  const hw = item.offsetWidth / 2
  const hh = item.offsetHeight / 2
  const zone = Math.max(CORNER_MIN_PX, Math.min(hw, hh) * 2 * CORNER_RATIO)
  return Math.abs(lx) > hw - zone && Math.abs(ly) > hh - zone
}

/**
 * 포스터를 마우스로 끌어 보드 안 아무 곳에나 놓는다.
 *
 * 위치는 보드 크기에 대한 %로 저장해 창 크기가 바뀌어도 같은 자리에 남는다. 포스터가 보드 밖으로
 * 나가지 않도록 왼쪽·위 모서리를 [0, 100 − 포스터 크기]로 묶는다. 콘텐츠 구성이 바뀌면 처음 배치로 돌아간다.
 */
function useCollageDrag(contentKey: string, enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [positions, setPositions] = useState<Record<number, Position>>({})
  const [order, setOrder] = useState<Record<number, number>>({})
  const [rotations, setRotations] = useState<Record<number, number>>({})
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [rotatingIndex, setRotatingIndex] = useState<number | null>(null)
  const topZ = useRef(30)
  const movedRef = useRef(false)

  useEffect(() => {
    setPositions({})
    setOrder({})
    setRotations({})
  }, [contentKey])

  /** 마우스가 모서리 위에 있으면 회전 커서를 보여 준다. 렌더 없이 data 속성만 바꾼다. */
  function hover(event: PointerEvent<HTMLElement>) {
    if (!enabled || event.buttons !== 0) return
    const item = event.currentTarget
    const corner = isCornerHit(item, event.clientX, event.clientY)
    if ((item.dataset.corner === 'true') !== corner) item.dataset.corner = String(corner)
  }

  /** 모서리를 잡고 돌린다. 포스터 가운데를 축으로, 누른 순간의 각도에서 마우스가 돈 만큼 더한다. */
  function startRotate(event: PointerEvent<HTMLElement>, index: number) {
    const item = event.currentTarget
    const rect = item.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const angleAt = (x: number, y: number) => (Math.atan2(y - cy, x - cx) * 180) / Math.PI
    const startPointer = angleAt(event.clientX, event.clientY)
    const startRotation = visibleAngle(item)

    movedRef.current = false
    setOrder((prev) => ({ ...prev, [index]: ++topZ.current }))
    setRotations((prev) => ({ ...prev, [index]: startRotation }))
    setRotatingIndex(index)

    const onMove = (e: globalThis.PointerEvent) => {
      let next = startRotation + angleAt(e.clientX, e.clientY) - startPointer
      next = ((next + 540) % 360) - 180
      // Shift를 누르고 돌리면 15도 단위로 맞춘다.
      if (e.shiftKey) next = Math.round(next / 15) * 15
      movedRef.current = true
      setRotations((prev) => ({ ...prev, [index]: next }))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setRotatingIndex(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function start(event: PointerEvent<HTMLElement>, index: number) {
    if (!enabled || event.button !== 0) return
    // 수정 버튼을 누를 때는 끌지 않는다.
    if ((event.target as HTMLElement).closest('.collage-item__edit')) return
    const container = containerRef.current
    if (!container) return
    // 브라우저 기본 이미지 끌기(반투명 사본이 따라오다 제자리로 돌아가는 동작)가 시작되면
    // 그동안 pointermove가 오지 않아 포스터가 멈춘다. 기본 동작을 막아 우리 끌기만 남긴다.
    event.preventDefault()

    const item = event.currentTarget
    if (isCornerHit(item, event.clientX, event.clientY)) {
      startRotate(event, index)
      return
    }
    const box = container.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const startLeft = (item.offsetLeft / box.width) * 100
    const startTop = (item.offsetTop / box.height) * 100
    const maxLeft = 100 - (item.offsetWidth / box.width) * 100
    const maxTop = 100 - (item.offsetHeight / box.height) * 100
    const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), Math.max(max, 0))
    // CSS가 실제 위치를 --slot-left/top에서 더 옮겨 놓을 수 있다(예: 크게 그린 포스터를 가운데 기준으로
    // 키우려고 왼쪽으로 당김). 경계는 실제 위치로 재고, 저장은 그 차이를 빼서 변수 기준으로 한다.
    const varLeft = parseFloat(item.style.getPropertyValue('--slot-left')) || 0
    const varTop = parseFloat(item.style.getPropertyValue('--slot-top')) || 0
    const shiftLeft = startLeft - varLeft
    const shiftTop = startTop - varTop

    movedRef.current = false
    setOrder((prev) => ({ ...prev, [index]: ++topZ.current }))

    const onMove = (e: globalThis.PointerEvent) => {
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (!movedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      if (!movedRef.current) {
        movedRef.current = true
        setDraggingIndex(index)
      }
      setPositions((prev) => ({
        ...prev,
        [index]: {
          left: clamp(startLeft + (dx / box.width) * 100, maxLeft) - shiftLeft,
          top: clamp(startTop + (dy / box.height) * 100, maxTop) - shiftTop,
        },
      }))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setDraggingIndex(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  /** 방금 끌기가 끝났으면 그 클릭은 삼킨다. 한 번만 참을 돌려준다. */
  function consumeClick() {
    const moved = movedRef.current
    movedRef.current = false
    return moved
  }

  // 마우스를 올린 포스터는 누른 순서로 쌓인 어떤 포스터보다도 위에 그린다.
  const hoverZ = Math.max(20, ...Object.values(order)) + 1

  return {
    containerRef, positions, order, rotations, hoverZ, draggingIndex, rotatingIndex,
    start, hover, consumeClick,
  }
}

interface BoardCollageProps {
  contents: ContentSummary[]
  interactive?: boolean
  className?: string
  /** 넘기면 포스터가 버튼이 되어 콘텐츠 상세를 열 수 있다. */
  onContentSelect?: (content: ContentSummary) => void
  /** 넘기면 포스터에 마우스를 올렸을 때 수정 버튼이 뜬다. slotIndex는 0부터 시작한다. */
  onContentEdit?: (content: ContentSummary, slotIndex: number) => void
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
  onContentEdit,
}: BoardCollageProps) {
  // 8건 이하면 캔버스를 꽉 채우는 2행 배치, 그 이상이면 3행 배치를 쓴다.
  const slots = contents.length <= SLOTS_8.length ? SLOTS_8 : SLOTS_12
  const drag = useCollageDrag(contents.map((c) => c.id).join(','), interactive)

  return (
    <div
      ref={drag.containerRef}
      style={{ '--hover-z': drag.hoverZ } as CSSProperties}
      className={`board-collage ${interactive ? 'board-collage--interactive' : 'board-collage--thumbnail'} ${className}`}
      aria-label={`${contents.length}개의 콘텐츠로 구성된 보드`}
    >
      {contents.slice(0, slots.length).map((content, index) => {
        const slot = slots[index]
        const moved = drag.positions[index]
        const style = {
          '--slot-left': `${moved?.left ?? slot.left}%`,
          '--slot-top': `${moved?.top ?? slot.top}%`,
          '--slot-width': `${slot.width}%`,
          '--slot-rotate': `${drag.rotations[index] ?? slot.rotate}deg`,
          // 누른 적 있는 포스터는 누른 순서대로 위에 쌓는다. 인라인 z-index가 아니라 변수로 넘겨야
          // 마우스를 올린 포스터(--hover-z)가 이 순서보다 앞으로 나올 수 있다.
          '--slot-z': drag.order[index] ?? slot.zIndex,
        } as CSSProperties

        return (
          <figure
            className={[
              'collage-item',
              drag.draggingIndex === index && 'collage-item--dragging',
              drag.rotatingIndex === index && 'collage-item--rotating',
              drag.rotations[index] !== undefined && 'collage-item--custom-rotate',
            ].filter(Boolean).join(' ')}
            key={`${content.id}-${index}`}
            style={style}
            onPointerDown={interactive ? (e) => drag.start(e, index) : undefined}
            onPointerMove={interactive ? drag.hover : undefined}
            // 끌어서 옮긴 뒤 손을 뗄 때 상세 패널이 열리지 않게 클릭을 삼킨다.
            onClickCapture={(e) => {
              if (drag.consumeClick()) {
                e.preventDefault()
                e.stopPropagation()
              }
            }}
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
            {/* 포스터가 이미 버튼이라 그 안에 넣을 수 없다(버튼 중첩). figure의 형제로 둔다. */}
            {onContentEdit && (
              <button
                className="collage-item__edit"
                // 보드 사진(PNG)에는 담지 않는다. BoardExpandModal의 캡처가 이 표시가 붙은 요소를 뺀다.
                data-capture-exclude
                type="button"
                onClick={() => onContentEdit(content, index)}
                aria-label={`${content.title || '제목 미상'} 교체하기`}
              >
                수정
              </button>
            )}
            {interactive && (
              <figcaption className="collage-item__details" data-capture-exclude>
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
