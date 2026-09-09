import { Select } from './ui'

export type SortDirection = 'asc' | 'desc'

export type SortOption = { value: string; label: string }

function SortArrowIcon({ direction }: { direction: SortDirection }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 transition-transform ${direction === 'asc' ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export function SortControl({
  options,
  sortKey,
  direction,
  onChange,
}: {
  options: SortOption[]
  sortKey: string
  direction: SortDirection
  onChange: (sortKey: string, direction: SortDirection) => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden text-xs font-semibold text-zinc-500 sm:inline">Sort by</span>
      <Select
        value={sortKey}
        onChange={(e) => onChange(e.target.value, direction)}
        className="!w-auto min-w-[8.5rem] !py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <button
        type="button"
        onClick={() => onChange(sortKey, direction === 'asc' ? 'desc' : 'asc')}
        aria-label={direction === 'asc' ? 'Sort ascending' : 'Sort descending'}
        title={direction === 'asc' ? 'Ascending' : 'Descending'}
        className="flex h-[2.375rem] w-[2.375rem] shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:bg-zinc-50"
      >
        <SortArrowIcon direction={direction} />
      </button>
    </div>
  )
}

export function sortByKey<T>(
  items: T[],
  sortKey: string,
  direction: SortDirection,
  extract: (item: T, key: string) => string | number,
): T[] {
  const sorted = [...items].sort((a, b) => {
    const av = extract(a, sortKey)
    const bv = extract(b, sortKey)
    if (typeof av === 'number' && typeof bv === 'number') return av - bv
    return String(av).localeCompare(String(bv))
  })
  return direction === 'desc' ? sorted.reverse() : sorted
}
