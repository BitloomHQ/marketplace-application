import { useState } from 'react'

type Props = {
  value: number
  onChange: (rating: number) => void
  disabled?: boolean
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-9 w-9 transition-colors ${filled ? 'text-amber-400' : 'text-zinc-300'}`}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

export function StarRating({ value, onChange, disabled }: Props) {
  const [hover, setHover] = useState(0)
  const [dragging, setDragging] = useState(false)

  const display = hover || value

  const setStar = (star: number) => {
    if (disabled) return
    onChange(star)
  }

  return (
    <div
      className={`flex items-center gap-0.5 ${disabled ? 'opacity-50' : ''}`}
      role="radiogroup"
      aria-label="Rating"
      onMouseLeave={() => {
        setHover(0)
        setDragging(false)
      }}
      onMouseUp={() => setDragging(false)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className="rounded-lg p-0.5 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 disabled:cursor-not-allowed"
          aria-label={`${star} out of 5 stars`}
          aria-checked={value === star}
          role="radio"
          onMouseEnter={() => {
            setHover(star)
            if (dragging) setStar(star)
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            setDragging(true)
            setStar(star)
          }}
          onClick={() => setStar(star)}
        >
          <Star filled={star <= display} />
        </button>
      ))}
      <span className="ml-2 min-w-[4.5rem] text-sm font-semibold text-zinc-600">
        {value > 0 ? `${value} / 5` : 'Tap a star'}
      </span>
    </div>
  )
}
