interface SectionHeadingProps {
  title: string
}

export function SectionHeading({ title }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
    </div>
  )
}
