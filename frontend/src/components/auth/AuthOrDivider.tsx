export function AuthOrDivider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-zinc-200" />
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">or</span>
      <div className="h-px flex-1 bg-zinc-200" />
    </div>
  )
}
