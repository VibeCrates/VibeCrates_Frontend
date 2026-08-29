import { useState } from 'react'
import type { ContentSummary } from '../../../shared/types/content'

interface ContentArtworkProps {
  content: ContentSummary
}

export function ContentArtwork({ content }: ContentArtworkProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasImage = Boolean(content.imageUrl) && !imageFailed

  return (
    <div className={`artwork artwork--${content.contentType.toLowerCase()}`}>
      {hasImage ? (
        <img
          src={content.imageUrl ?? undefined}
          alt=""
          crossOrigin="anonymous"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="artwork__fallback" aria-hidden="true">
          <span>{content.contentType.slice(0, 1)}</span>
          <strong>{content.title || 'Untitled'}</strong>
        </div>
      )}
    </div>
  )
}
