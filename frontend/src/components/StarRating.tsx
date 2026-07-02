type Props = {
  rating: number
  totalReviews?: number
  size?: 'sm' | 'md'
}

function Star({ filled, size }: { filled: boolean; size: 'sm' | 'md' }) {
  const className = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
  return (
    <svg
      className={`${className} ${filled ? 'text-amber-400' : 'text-zinc-200'}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}

export function StarRating({ rating, totalReviews = 0, size = 'sm' }: Props) {
  const filledCount =
    totalReviews > 0 ? Math.max(0, Math.min(5, Math.round(rating))) : 0

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={totalReviews > 0 ? `${rating} out of 5 stars` : 'No reviews yet'}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} filled={i < filledCount} size={size} />
      ))}
    </span>
  )
}
