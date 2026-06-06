import type { ReactNode } from 'react'
import { AuthLogo } from './AuthLogo'

type Props = {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLoginShell({ title, subtitle, children, footer }: Props) {
  return (
    <>
      <div className="rounded-[1.75rem] border border-zinc-100 bg-white px-6 py-8 shadow-xl shadow-zinc-300/25 sm:px-8 sm:py-10">
        <AuthLogo />
        <h1 className="text-center text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-zinc-500">
          {subtitle}
        </p>
        <div className="mt-8">{children}</div>
        {footer}
      </div>
      <p className="mt-8 text-center text-xs text-zinc-400">
        Copyright @bitloom{' '}
        <span className="text-zinc-300">|</span>{' '}
        <a href="#" className="hover:text-sky-600">
          Privacy Policy
        </a>
      </p>
    </>
  )
}
