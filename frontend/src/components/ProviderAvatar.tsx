type Props = {
  name: string
  imageUrl?: string | null
  size?: 'md' | 'lg'
}

export function ProviderAvatar({ name, imageUrl, size = 'md' }: Props) {
  const dim = size === 'lg' ? 'h-14 w-14 text-xl' : 'h-12 w-12 text-lg'

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ring-2 ring-violet-100`}
      />
    )
  }

  return (
    <span
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
