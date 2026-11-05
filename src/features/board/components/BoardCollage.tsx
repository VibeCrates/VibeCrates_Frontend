import {
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react'
import type { SlotLayout } from '../../../shared/types/board'
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
 *
 * 이 값이 <b>기본 배치</b>다. 저장된 배치가 없는(null) 보드는 이대로 그린다. 기본 배치는 여기에만 두고 DB에 복사하지 않는다 —
 * 복사하면 이 값을 다듬어도 이미 저장된 보드가 옛 모양으로 남는다(백엔드 docs/board-schema.md 12-1).
 * 포스터 너비(width)는 배치를 저장한 보드에서도 칸 번호로 정한다.
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

type Slot = (typeof SLOTS_8)[number]

/** 이만큼(px) 움직이기 전까지는 끌기가 아니라 클릭으로 본다. */
const DRAG_THRESHOLD = 4

/**
 * 터치로는 이만큼(ms) 누르고 있어야 포스터를 집는다. 그 전에 움직이면 화면 스크롤로 넘긴다 —
 * 바로 집으면 보드 위에서 화면을 쓸어 넘길 수 없다.
 */
const LONG_PRESS_MS = 350

/** Shift를 누르고 돌리면 이 각도(도) 단위로 맞춘다. */
const ROTATE_SNAP = 15

const round2 = (value: number) => Math.round(value * 100) / 100
/** min이 max보다 크면(포스터가 보드보다 크면) 가운데에 둔다. */
const clamp = (value: number, min: number, max: number) =>
  min > max ? 50 : Math.min(Math.max(value, min), max)
/** -180~180으로 접는다. 서버가 이 범위만 받는다. */
const normalizeAngle = (degrees: number) => {
  const folded = ((((degrees + 180) % 360) + 360) % 360) - 180
  return folded === -180 ? 180 : folded
}

/**
 * 지금 그려진 기본 배치를 8칸 배치로 읽는다. 처음 포스터를 옮기는 순간 한 번만 부른다.
 *
 * 화면에 보이는 그대로를 옮겨 적어야 포스터를 집는 순간 다른 포스터가 튀지 않는다. offsetLeft·offsetWidth는
 * transform(회전)을 빼고 잰 값이라, 회전과 무관한 중심을 얻는다.
 */
function readDefaultLayout(container: HTMLElement, items: (HTMLElement | null)[], slots: Slot[]): SlotLayout[] {
  const width = container.clientWidth
  const height = container.clientHeight
  // 기본 배치의 겹침(zIndex가 같으면 앞 칸이 아래)을 1~8 순위로 바꾼다. 서버는 한 번씩만 받는다.
  const rank: number[] = []
  slots
    .map((slot, index) => ({ index, zIndex: slot.zIndex }))
    .sort((a, b) => a.zIndex - b.zIndex || a.index - b.index)
    .forEach(({ index }, order) => {
      rank[index] = order + 1
    })

  return slots.map((slot, index) => {
    const item = items[index]
    const x = item ? ((item.offsetLeft + item.offsetWidth / 2) / width) * 100 : slot.left + slot.width / 2
    const y = item ? ((item.offsetTop + item.offsetHeight / 2) / height) * 100 : slot.top + slot.width / 2
    return { x: round2(clamp(x, 0, 100)), y: round2(clamp(y, 0, 100)), rotation: slot.rotate, z: rank[index] }
  })
}

/** 집은 포스터를 맨 위로. 그보다 위에 있던 포스터를 한 칸씩 내려 1~8을 유지한다. */
function bringToFront(layout: SlotLayout[], index: number): SlotLayout[] {
  const lifted = layout[index].z
  return layout.map((item, i) => {
    if (i === index) {
      return { ...item, z: layout.length }
    }
    return item.z > lifted ? { ...item, z: item.z - 1 } : item
  })
}

/** 포스터 중심이 보드 안에 머물 수 있는 범위(%). 포스터 절반만큼 안쪽이다. 회전은 무시한다. */
function boundsOf(container: HTMLElement, item: HTMLElement) {
  const halfX = (item.offsetWidth / 2 / container.clientWidth) * 100
  const halfY = (item.offsetHeight / 2 / container.clientHeight) * 100
  return { minX: halfX, maxX: 100 - halfX, minY: halfY, maxY: 100 - halfY }
}

interface Gesture {
  index: number
  kind: 'move' | 'rotate'
  startX: number
  startY: number
  /** 터치는 길게 눌러야 참이 된다. 마우스·펜은 처음부터 참이다. */
  armed: boolean
  /** 임계값을 넘겨 실제로 움직이기 시작했는지. 이때 처음 배치를 만든다. */
  started: boolean
  base: SlotLayout[] | null
  timer: number | null
  cleanup: () => void
}

/**
 * 포스터 끌어 옮기기(가운데)와 돌리기(왼쪽 위 손잡이).
 *
 * 배치는 부모가 가진다(controlled). 움직일 때마다 8칸 배치 전체를 onLayoutChange로 올려보낸다. 기본 배치(null)인 보드는
 * 실제로 움직이기 시작할 때 화면의 기본 배치를 읽어 8칸 배치를 만든다 — 누르기만 하고 놓으면 기본 배치 그대로다.
 */
function useCollageGestures(
  containerRef: RefObject<HTMLDivElement | null>,
  itemRefs: RefObject<(HTMLElement | null)[]>,
  slots: Slot[],
  layout: SlotLayout[] | null,
  onLayoutChange: ((layout: SlotLayout[]) => void) | undefined,
) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [rotatingIndex, setRotatingIndex] = useState<number | null>(null)
  /** 마지막으로 누른 포스터. 마우스를 올릴 수 없는 터치 화면에서 손잡이·수정 버튼을 이 포스터에만 띄운다. */
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  /** 길게 눌러 집은 포스터(터치). 집혔다는 것을 보여 준다. */
  const [liftedIndex, setLiftedIndex] = useState<number | null>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const suppressClickRef = useRef(false)

  function end() {
    const gesture = gestureRef.current
    if (!gesture) {
      return
    }
    gesture.cleanup()
    if (gesture.timer !== null) {
      window.clearTimeout(gesture.timer)
    }
    // 끌었거나 길게 눌러 집었으면 손을 뗄 때의 클릭(상세 열기)을 삼킨다.
    suppressClickRef.current = gesture.started || (gesture.kind === 'move' && gesture.armed && gesture.timer !== null)
    gestureRef.current = null
    setDraggingIndex(null)
    setRotatingIndex(null)
    setLiftedIndex(null)
  }

  /** 처음 움직일 때 배치를 정한다. 기본 배치면 화면에서 읽고, 집은 포스터를 맨 위로 올린다. */
  function begin(gesture: Gesture): SlotLayout[] | null {
    const container = containerRef.current
    if (!container) {
      return null
    }
    const current = layout ?? readDefaultLayout(container, itemRefs.current, slots)
    gesture.started = true
    gesture.base = bringToFront(current, gesture.index)
    if (gesture.kind === 'move') {
      setDraggingIndex(gesture.index)
    } else {
      setRotatingIndex(gesture.index)
    }
    return gesture.base
  }

  function moveTo(gesture: Gesture, event: PointerEvent) {
    const container = containerRef.current
    const item = itemRefs.current[gesture.index]
    const base = gesture.base
    if (!container || !item || !base || !onLayoutChange) {
      return
    }
    const origin = base[gesture.index]
    const next = { ...origin }

    if (gesture.kind === 'move') {
      const bounds = boundsOf(container, item)
      next.x = round2(clamp(origin.x + ((event.clientX - gesture.startX) / container.clientWidth) * 100, bounds.minX, bounds.maxX))
      next.y = round2(clamp(origin.y + ((event.clientY - gesture.startY) / container.clientHeight) * 100, bounds.minY, bounds.maxY))
    } else {
      // 포스터 가운데를 축으로, 누른 순간의 각도에서 손가락·마우스가 돈 만큼 더한다.
      const rect = item.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const angleAt = (x: number, y: number) => (Math.atan2(y - cy, x - cx) * 180) / Math.PI
      let rotation = origin.rotation + angleAt(event.clientX, event.clientY) - angleAt(gesture.startX, gesture.startY)
      if (event.shiftKey) {
        rotation = Math.round(rotation / ROTATE_SNAP) * ROTATE_SNAP
      }
      next.rotation = round2(normalizeAngle(rotation))
    }
    onLayoutChange(base.map((itemLayout, i) => (i === gesture.index ? next : itemLayout)))
  }

  function start(event: ReactPointerEvent<HTMLElement>, index: number, kind: Gesture['kind']) {
    setActiveIndex(index)
    if (!onLayoutChange || gestureRef.current || (event.pointerType === 'mouse' && event.button !== 0)) {
      return
    }
    const isTouchMove = event.pointerType === 'touch' && kind === 'move'
    if (!isTouchMove) {
      // 브라우저 기본 이미지 끌기·글자 선택이 시작되면 그동안 pointermove가 오지 않아 포스터가 멈춘다.
      event.preventDefault()
    }

    const onMove = (e: PointerEvent) => {
      const gesture = gestureRef.current
      if (!gesture || e.pointerId !== pointerId) {
        return
      }
      const moved = Math.hypot(e.clientX - gesture.startX, e.clientY - gesture.startY)
      if (!gesture.armed) {
        // 길게 누르기 전에 움직였다. 스크롤하려는 것이므로 놓아준다.
        if (moved >= DRAG_THRESHOLD) {
          end()
        }
        return
      }
      if (!gesture.started) {
        if (moved < DRAG_THRESHOLD) {
          return
        }
        begin(gesture)
      }
      moveTo(gesture, e)
    }
    // 집은 뒤에는 화면이 같이 스크롤되지 않게 막는다. passive가 아니어야 막을 수 있다.
    const onTouchMove = (e: TouchEvent) => {
      if (gestureRef.current?.armed) {
        e.preventDefault()
      }
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === pointerId) {
        end()
      }
    }

    const pointerId = event.pointerId
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })

    const gesture: Gesture = {
      index,
      kind,
      startX: event.clientX,
      startY: event.clientY,
      armed: !isTouchMove,
      started: false,
      base: null,
      timer: null,
      cleanup: () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        window.removeEventListener('touchmove', onTouchMove)
      },
    }
    if (isTouchMove) {
      gesture.timer = window.setTimeout(() => {
        gesture.armed = true
        setLiftedIndex(index)
      }, LONG_PRESS_MS)
    }
    gestureRef.current = gesture
  }

  return {
    draggingIndex,
    rotatingIndex,
    activeIndex,
    liftedIndex,
    startMove(event: ReactPointerEvent<HTMLElement>, index: number) {
      // 수정 버튼·회전 손잡이를 누를 때는 옮기지 않는다.
      if ((event.target as HTMLElement).closest('.collage-item__edit, .collage-item__rotate')) {
        return
      }
      start(event, index, 'move')
    },
    startRotate(event: ReactPointerEvent<HTMLElement>, index: number) {
      event.stopPropagation()
      start(event, index, 'rotate')
    },
    /** 방금 끌기가 끝났으면 그 클릭은 삼킨다. 한 번만 참을 돌려준다. */
    consumeClick() {
      const suppressed = suppressClickRef.current
      suppressClickRef.current = false
      return suppressed
    },
  }
}

interface BoardCollageProps {
  contents: ContentSummary[]
  /** 저장된(또는 편집 중인) 배치. contents와 같은 순서의 8개이고, 없거나 null이면 기본 배치다. */
  layout?: SlotLayout[] | null
  interactive?: boolean
  className?: string
  /** 넘기면 포스터가 버튼이 되어 콘텐츠 상세를 열 수 있다. */
  onContentSelect?: (content: ContentSummary) => void
  /** 넘기면 포스터에 마우스를 올렸을 때 수정 버튼이 뜬다. slotIndex는 0부터 시작한다. */
  onContentEdit?: (content: ContentSummary, slotIndex: number) => void
  /**
   * 넘기면 포스터를 끌어 옮기고(가운데) 돌릴(왼쪽 위 손잡이) 수 있다. 움직일 때마다 8칸 배치 전체가 온다.
   * 저장은 하지 않는다 — 부모가 저장 버튼으로 보낸다.
   */
  onLayoutChange?: (layout: SlotLayout[]) => void
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
  layout = null,
  interactive = true,
  className = '',
  onContentSelect,
  onContentEdit,
  onLayoutChange,
}: BoardCollageProps) {
  // 8건 이하면 캔버스를 꽉 채우는 2행 배치, 그 이상이면 3행 배치를 쓴다.
  const slots = contents.length <= SLOTS_8.length ? SLOTS_8 : SLOTS_12
  // 배치는 8칸 보드에만 있다. 개수가 맞지 않으면(콘텐츠가 덜 찬 검색 결과) 기본 배치로 그린다.
  const placed = layout && layout.length === contents.length && contents.length === SLOTS_8.length ? layout : null
  const editable = interactive && Boolean(onLayoutChange) && contents.length === SLOTS_8.length
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const gestures = useCollageGestures(
    containerRef,
    itemRefs,
    slots.slice(0, contents.length),
    placed,
    editable ? onLayoutChange : undefined,
  )
  // 표지가 늦게 뜨면 포스터 높이가 바뀐다. 아래 경계 보정을 다시 하도록 그때 한 번 더 그린다.
  const [, remeasure] = useReducer((count: number) => count + 1, 0)

  // 저장된 위치는 그대로 두고, 그릴 때만 포스터가 보드 밖으로 나가지 않게 안쪽으로 당긴다. 표지 높이가 원본 비율을 따라
  // 나중에 이미지가 채워지거나 바뀌면(2:3 대체 표지 → 실제 표지) 가장자리 포스터가 조금 삐져나갈 수 있다(12-5).
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }
    itemRefs.current.forEach((item, index) => {
      if (!item) {
        return
      }
      const position = placed?.[index]
      if (!position || !container.clientWidth || !container.clientHeight) {
        item.style.removeProperty('left')
        item.style.removeProperty('top')
        return
      }
      const bounds = boundsOf(container, item)
      item.style.left = `${clamp(position.x, bounds.minX, bounds.maxX)}%`
      item.style.top = `${clamp(position.y, bounds.minY, bounds.maxY)}%`
    })
  })

  return (
    <div
      ref={containerRef}
      className={[
        'board-collage',
        interactive ? 'board-collage--interactive' : 'board-collage--thumbnail',
        editable && 'board-collage--editable',
        className,
      ].filter(Boolean).join(' ')}
      aria-label={`${contents.length}개의 콘텐츠로 구성된 보드`}
      onLoadCapture={remeasure}
    >
      {contents.slice(0, slots.length).map((content, index) => {
        const slot = slots[index]
        const position = placed?.[index]
        const style = {
          '--slot-left': `${slot.left}%`,
          '--slot-top': `${slot.top}%`,
          '--slot-width': `${slot.width}%`,
          '--slot-rotate': `${position?.rotation ?? slot.rotate}deg`,
          // 인라인 z-index가 아니라 변수로 넘겨야 마우스를 올린 포스터가 이 순서보다 앞으로 나올 수 있다.
          '--slot-z': position?.z ?? slot.zIndex,
          ...(position ? { '--x': `${position.x}%`, '--y': `${position.y}%` } : {}),
        } as CSSProperties

        return (
          <figure
            className={[
              'collage-item',
              position && 'collage-item--placed',
              gestures.draggingIndex === index && 'collage-item--dragging',
              gestures.rotatingIndex === index && 'collage-item--rotating',
              gestures.liftedIndex === index && 'collage-item--lifted',
              editable && gestures.activeIndex === index && 'collage-item--active',
            ].filter(Boolean).join(' ')}
            key={`${content.id}-${index}`}
            ref={(element) => {
              itemRefs.current[index] = element
            }}
            style={style}
            onPointerDown={editable ? (event) => gestures.startMove(event, index) : undefined}
            // 길게 눌러 집을 때 휴대폰이 띄우는 메뉴(이미지 저장 등)를 막는다.
            onContextMenu={editable ? (event) => event.preventDefault() : undefined}
            // 끌어서 옮긴 뒤 손을 뗄 때 상세 패널이 열리지 않게 클릭을 삼킨다.
            onClickCapture={(event) => {
              if (gestures.consumeClick()) {
                event.preventDefault()
                event.stopPropagation()
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
            {editable && (
              // 보드 사진(PNG)에는 담지 않는다. BoardExpandModal의 캡처가 이 표시가 붙은 요소를 뺀다.
              <span
                className="collage-item__rotate"
                data-capture-exclude
                aria-hidden="true"
                title="끌어서 돌리기 (Shift: 15도씩)"
                onPointerDown={(event) => gestures.startRotate(event, index)}
              >
                ⟳
              </span>
            )}
            {/* 포스터가 이미 버튼이라 그 안에 넣을 수 없다(버튼 중첩). figure의 형제로 둔다. */}
            {onContentEdit && (
              <button
                className="collage-item__edit"
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
