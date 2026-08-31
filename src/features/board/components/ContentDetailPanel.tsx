import { useContentDetail } from '../../content/model/contentQueries'
import type {
  BookDetail,
  ContentSummary,
  MovieDetail,
  MusicDetail,
} from '../../../shared/types/content'

interface ContentDetailPanelProps {
  content: ContentSummary
  onClose: () => void
}

/** 값이 비면 항목 자체를 그린다. 시딩 데이터에 없는 필드(예: 도서 publisher)가 빈칸으로 남지 않게 한다. */
function Field({ label, value }: { label: string; value: string | null }) {
  if (!value) {
    return null
  }
  return (
    <div className="detail-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function joinList(value: string[] | null): string | null {
  return value?.length ? value.join(', ') : null
}

function DetailFields({
  contentType,
  detail,
}: {
  contentType: ContentSummary['contentType']
  detail: MovieDetail | BookDetail | MusicDetail
}) {
  if (contentType === 'MOVIE') {
    const movie = detail as MovieDetail
    return (
      <>
        <Field label="감독" value={joinList(movie.director)} />
        <Field label="출연" value={joinList(movie.actor)} />
        <Field
          label="상영시간"
          value={movie.runningTime ? `${movie.runningTime}분` : null}
        />
      </>
    )
  }

  if (contentType === 'BOOK') {
    const book = detail as BookDetail
    return (
      <>
        <Field label="저자" value={book.author} />
        <Field label="출판사" value={book.publisher} />
      </>
    )
  }

  const music = detail as MusicDetail
  return <Field label="아티스트" value={joinList(music.artist)} />
}

export function ContentDetailPanel({ content, onClose }: ContentDetailPanelProps) {
  const detail = useContentDetail(content.contentType, content.id)
  // 가사/책 소개는 수 KB에 달할 수 있어 본문 영역에서 따로 스크롤시킨다.
  const plot = detail.data && 'plot' in detail.data ? detail.data.plot : null

  return (
    <aside className="content-detail" aria-label={`${content.title ?? '콘텐츠'} 상세 정보`}>
      <header className="content-detail__head">
        <div>
          <span className={`domain-pill domain-pill--${content.contentType.toLowerCase()}`}>
            {content.contentType}
          </span>
          <h3>{content.title || '제목 미상'}</h3>
          <p>{content.releaseYear ?? '연도 미상'}</p>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="상세 닫기">
          ×
        </button>
      </header>

      {detail.isPending ? (
        <div className="content-detail__body">
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line" />
          <div className="skeleton skeleton--line" />
        </div>
      ) : detail.isError ? (
        <div className="content-detail__body content-detail__body--error">
          <p>상세 정보를 불러오지 못했어요.</p>
          <button type="button" onClick={() => void detail.refetch()}>
            다시 시도
          </button>
        </div>
      ) : detail.data ? (
        <div className="content-detail__body">
          <dl className="detail-fields">
            <DetailFields contentType={content.contentType} detail={detail.data} />
          </dl>
          {plot ? <p className="detail-plot">{plot}</p> : null}
        </div>
      ) : null}
    </aside>
  )
}
