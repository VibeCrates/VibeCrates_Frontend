import { useEffect, useState } from 'react'

/**
 * 값이 잠잠해질 때까지 기다렸다가 반영한다.
 *
 * 검색창은 한 글자마다 값이 바뀌는데, 그때마다 요청을 보내면 타이핑 한 번에 대여섯 번이 나간다.
 * 마지막 입력 이후 delay만큼 조용할 때만 값을 넘겨 요청 수를 줄인다.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    // 값이 또 바뀌면 이전 타이머를 버린다. 이게 없으면 지연이 아니라 그냥 딜레이가 된다.
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
