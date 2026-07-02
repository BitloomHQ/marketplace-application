type Props = {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

function StarButton({
  filled,
  onClick,
  disabled,
}: {
  filled: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded p-0.5 transition hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={filled ? 'Filled star' : 'Empty star'}
    >
      <svg
        className={`h-8 w-8 ${filled ? 'text-amber-400' : 'text-zinc-300'}`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </button>
  )
}

export function StarRatingInput({ value, onChange, disabled }: Props) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Select star rating">
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1
        return (
          <StarButton
            key={star}
            filled={star <= value}
            onClick={() => onChange(star)}
            disabled={disabled}
          />
        )
      })}
    </div>
  )
}
