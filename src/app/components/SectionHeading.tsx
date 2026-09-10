import type { ReactNode } from 'react'

interface SectionHeadingProps {
  title: string
  /** 제목 오른쪽에 붙는 보조 동작. "더 보기" 링크처럼 섹션에 딸린 것만 둔다. */
  action?: ReactNode
}

export function SectionHeading({ title, action }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {action}
    </div>
  )
}
