import { useEffect, useState, type ReactNode } from 'react'
import { restoreSession } from '../../../shared/api'

interface AuthBootstrapProps {
  children: ReactNode
}

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const [isRestoring, setIsRestoring] = useState(true)

  useEffect(() => {
    let active = true

    void restoreSession().finally(() => {
      if (active) {
        setIsRestoring(false)
      }
    })

    return () => {
      active = false
    }
  }, [])

  if (isRestoring) {
    return <main className="status-page">로그인 상태를 확인하고 있습니다.</main>
  }

  return children
}
