import { useState, type FormEvent } from 'react'

interface SearchBarProps {
  initialValue?: string
  compact?: boolean
  isPending?: boolean
  onSearch: (keyword: string) => void
}

export function SearchBar({
  initialValue = '',
  compact = false,
  isPending = false,
  onSearch,
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(initialValue)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedKeyword = keyword.trim()
    if (!normalizedKeyword || isPending) return
    onSearch(normalizedKeyword)
  }

  return (
    <form
      className={`search-bar ${compact ? 'search-bar--compact' : ''}`}
      onSubmit={handleSubmit}
      role="search"
    >
      <span className="search-bar__spark" aria-hidden="true">✦</span>
      <label className="sr-only" htmlFor={compact ? 'board-search' : 'home-search'}>
        컬렉션 검색어
      </label>
      <input
        id={compact ? 'board-search' : 'home-search'}
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        maxLength={100}
        placeholder="create your own collection via searching"
        autoComplete="off"
      />
      <button type="submit" disabled={!keyword.trim() || isPending}>
        <span>{isPending ? '찾는 중' : 'Create'}</span>
        <span aria-hidden="true">↗</span>
      </button>
    </form>
  )
}
