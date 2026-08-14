type ShimmerProps = {
  className?: string
}

export function Shimmer({ className = '' }: ShimmerProps) {
  return <div className={`shimmer ${className}`.trim()} aria-hidden="true" />
}

export function ShimmerText({ className = '' }: ShimmerProps) {
  return <Shimmer className={`h-3 rounded-md ${className}`} />
}

export function ShimmerCircle({ className = '' }: ShimmerProps) {
  return <Shimmer className={`rounded-full ${className}`} />
}

export function ServiceCirclesSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex w-full gap-3 sm:gap-4">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex w-[calc((100%-4*0.75rem)/5)] shrink-0 flex-col items-center sm:w-[calc((100%-4*1rem)/5)]"
        >
          <ShimmerCircle className="aspect-square w-[78%] rounded-full sm:w-[80%]" />
          <ShimmerText className="mt-3 w-16" />
          <ShimmerText className="mt-2 w-24" />
        </div>
      ))}
    </div>
  )
}

export function SpotlightRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-4 sm:grid sm:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Shimmer key={i} className="aspect-[4/3] w-[min(88vw,20rem)] shrink-0 rounded-2xl sm:w-auto" />
      ))}
    </div>
  )
}

export function NoteworthyGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <Shimmer key={i} className="aspect-[4/5] rounded-2xl" />
      ))}
    </div>
  )
}

export function ListCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <Shimmer key={i} className="h-36 rounded-2xl sm:h-40" />
      ))}
    </div>
  )
}

export function ProfileFormSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <ShimmerCircle className="h-20 w-20" />
        <div className="flex-1 space-y-2">
          <ShimmerText className="w-32" />
          <ShimmerText className="w-48" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Shimmer className="h-11 rounded-xl" />
        <Shimmer className="h-11 rounded-xl" />
      </div>
      <Shimmer className="h-11 rounded-xl" />
      <Shimmer className="h-11 rounded-xl" />
      <Shimmer className="min-h-[96px] rounded-xl" />
      <Shimmer className="h-11 w-full rounded-full sm:w-40" />
    </div>
  )
}

export function AdminStatsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Shimmer key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  )
}

export function AdminListRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
          <Shimmer className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <ShimmerText className="w-28" />
            <ShimmerText className="w-40" />
            <ShimmerText className="w-56" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function CustomerHomeSkeleton() {
  return (
    <div className="space-y-10 pb-4">
      <section className="overflow-hidden rounded-[1.75rem] bg-sky-700/80 px-5 py-8 sm:px-8 sm:py-10">
        <div className="space-y-4">
          <Shimmer className="h-5 w-36 rounded-full opacity-40" />
          <Shimmer className="h-10 w-full max-w-md rounded-xl opacity-40" />
          <Shimmer className="h-16 w-full max-w-lg rounded-xl opacity-30" />
          <Shimmer className="h-11 w-40 rounded-full opacity-40" />
        </div>
      </section>

      <section>
        <div className="mb-4 space-y-2">
          <ShimmerText className="h-5 w-48" />
          <ShimmerText className="w-64" />
        </div>
        <ServiceCirclesSkeleton />
      </section>

      <section>
        <div className="mb-4 space-y-2">
          <ShimmerText className="h-5 w-36" />
          <ShimmerText className="w-52" />
        </div>
        <SpotlightRowSkeleton />
      </section>

      <section>
        <div className="mb-4 space-y-2">
          <ShimmerText className="h-5 w-40" />
          <ShimmerText className="w-56" />
        </div>
        <ServiceCirclesSkeleton count={3} />
      </section>
    </div>
  )
}
