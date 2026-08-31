import { useCallback, useRef } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

/** 이 거리(px)를 넘겨야 클릭이 아니라 드래그로 본다. 손떨림으로 링크 이동이 막히지 않게 하는 값. */
const DRAG_THRESHOLD_PX = 5

/**
 * 가로 스크롤 영역을 마우스로 잡아끌 수 있게 한다.
 *
 * - 터치/펜은 브라우저 기본 스크롤(관성 포함)이 더 자연스러워서 건드리지 않는다.
 * - 드래그로 끝난 제스처는 클릭을 삼킨다. 안 그러면 보드를 밀 때마다 타일 링크로 이동해버린다.
 * - 드래그 중에는 스크롤 스냅을 꺼서 손을 따라오는 느낌이 끊기지 않게 한다.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const state = useRef({ isDown: false, startX: 0, startScroll: 0, moved: false })

  const onPointerDown = useCallback((event: ReactPointerEvent<T>) => {
    const element = ref.current
    if (!element || event.pointerType !== 'mouse' || event.button !== 0) {
      return
    }
    state.current = {
      isDown: true,
      startX: event.clientX,
      startScroll: element.scrollLeft,
      moved: false,
    }
  }, [])

  const onPointerMove = useCallback((event: ReactPointerEvent<T>) => {
    const element = ref.current
    const current = state.current
    if (!current.isDown || !element) {
      return
    }

    const delta = event.clientX - current.startX
    if (!current.moved) {
      if (Math.abs(delta) < DRAG_THRESHOLD_PX) {
        return
      }
      current.moved = true
      // 커서가 영역 밖으로 나가도 드래그가 이어지도록 포인터를 붙잡아둔다.
      element.setPointerCapture(event.pointerId)
      element.classList.add('is-dragging')
    }

    element.scrollLeft = current.startScroll - delta
  }, [])

  const endDrag = useCallback((event: ReactPointerEvent<T>) => {
    const element = ref.current
    if (element) {
      if (element.hasPointerCapture(event.pointerId)) {
        element.releasePointerCapture(event.pointerId)
      }
      element.classList.remove('is-dragging')
    }
    state.current.isDown = false
  }, [])

  // pointerup 직후 발생하는 click을 캡처 단계에서 가로챈다.
  // moved는 다음 pointerdown에서 초기화되므로 여기서 되돌릴 필요가 없다.
  const onClickCapture = useCallback((event: ReactMouseEvent<T>) => {
    if (!state.current.moved) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
  }, [])

  return {
    ref,
    dragHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
    },
  }
}
