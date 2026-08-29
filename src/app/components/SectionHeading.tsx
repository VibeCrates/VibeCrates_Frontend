import type { ReactNode } from 'react'

interface SectionHeadingProps {
  eyebrow: string
  title: string
  aside?: ReactNode
}

export function SectionHeading({ eyebrow, title, aside }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        <span className="section-heading__eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {aside && <div className="section-heading__aside">{aside}</div>}
    </div>
  )
}
