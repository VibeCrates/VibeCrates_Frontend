import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { logout } from '../../features/auth/api/authApi'

interface MenuItem {
  label: string
  onSelect: () => void
  /** 아직 백엔드가 없는 항목. 자리는 잡아두되 누를 수는 없게 한다. */
  disabled?: boolean
  /** 비활성 이유. 왜 못 누르는지 알려주지 않으면 고장으로 읽힌다. */
  note?: string
}

/**
 * 우측 상단 계정 메뉴.
 *
 * <p>항목을 배열로 선언해두는 이유는 나중에 설정·프로필 같은 것이 붙을 자리이기 때문이다.
 * 추가가 한 줄로 끝나야 마크업이 항목 수만큼 늘어나지 않는다.</p>
 *
 * <p>보드 목록(좋아요/만든 것)은 여기 두지 않고 보관함 안의 탭으로 뺐다. 메뉴는 "어디로 갈지"만
 * 정하고 "무엇을 볼지"는 도착한 화면이 정한다. 목록을 메뉴에 늘어놓으면 항목이 늘어날수록
 * 계정 액션과 콘텐츠 뷰가 한 층에 섞인다.</p>
 */
export function HeaderMenu() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  async function handleLogout() {
    // logout API가 실패해도 로컬 토큰은 이미 비워지므로 로그인 화면으로 반드시 이동시킨다.
    try {
      await logout()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const items: MenuItem[] = [
    { label: '보관함', onSelect: () => navigate('/archive') },
    { label: '로그아웃', onSelect: () => void handleLogout() },
    {
      label: '탈퇴',
      onSelect: () => {},
      disabled: true,
      note: '준비 중',
    },
  ]

  // 바깥 클릭과 Esc로 닫는다. 메뉴가 열린 채로 다른 곳을 눌렀는데 그대로 떠 있으면
  // 화면을 가린 채 남는다.
  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        // 포커스를 트리거로 되돌린다. 그러지 않으면 키보드 사용자의 포커스가
        // 사라진 요소에 남아 Tab 순서가 문서 처음으로 튄다.
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function handleSelect(item: MenuItem) {
    if (item.disabled) {
      return
    }
    setOpen(false)
    item.onSelect()
  }

  return (
    <div className="header-menu" ref={containerRef}>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="메뉴"
        className="header-menu__trigger"
        onClick={() => setOpen((previous) => !previous)}
        ref={triggerRef}
        type="button"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      {open ? (
        <div className="header-menu__panel" id={menuId} role="menu">
          {items.map((item) => (
            <button
              className="header-menu__item"
              disabled={item.disabled}
              key={item.label}
              onClick={() => handleSelect(item)}
              role="menuitem"
              type="button"
            >
              <span>{item.label}</span>
              {item.note ? <small>{item.note}</small> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
