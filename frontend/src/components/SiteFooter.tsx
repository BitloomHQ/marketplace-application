import { Link } from 'react-router-dom'
import logo from '/logo.png'

const COMPANY_LINKS = [
  { to: '/about', label: 'About Us' },
  { to: '/investors', label: 'Investor Relations' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/careers', label: 'Careers' },
]

const CUSTOMER_LINKS = [
  { to: '/reviews', label: 'Zepserve Review' },
  { to: '/categories', label: 'Categories Near You' },
  { to: '/contact', label: 'Contact Us' },
]

const SOCIAL_LINKS = [
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M4.98 3.5C4.98 4.88 3.88 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.24 8.09h4.52V24H.24V8.09zM8.34 8.09h4.33v2.17h.06c.6-1.14 2.08-2.34 4.28-2.34 4.58 0 5.42 3.01 5.42 6.93V24h-4.52v-7.75c0-1.85-.03-4.22-2.57-4.22-2.57 0-2.96 2.01-2.96 4.08V24H8.34V8.09z" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: 'https://github.com',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6a4.6 4.6 0 0 1 1.2-3.3c-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8.1 3.1a4.6 4.6 0 0 1 1.2 3.3c0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
      </svg>
    ),
  },
  {
    label: 'X',
    href: 'https://x.com',
    icon: (
      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M18.9 1.5h3.7l-8 9.2L24 22.5h-7.4l-5.8-7.6-6.6 7.6H.5l8.6-9.8L0 1.5h7.6l5.2 6.9 6.1-6.9zm-1.3 18.9h2L6.5 3.5H4.3l13.3 16.9z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com',
    icon: (
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path d="M22.7 12.1C22.7 6.3 18 1.6 12.2 1.6S1.6 6.3 1.6 12.1c0 5.2 3.8 9.6 8.8 10.4v-7.3H7.8v-3.1h2.6V9.7c0-2.6 1.5-4 3.9-4 1.1 0 2.3.2 2.3.2v2.5h-1.3c-1.3 0-1.7.8-1.7 1.6v2h2.9l-.5 3.1h-2.4V22.5c5-.8 8.8-5.2 8.8-10.4z" />
      </svg>
    ),
  },
]

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-zinc-900">{title}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="text-sm text-zinc-500 transition hover:text-zinc-800"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid grid-cols-2 gap-10 lg:grid-cols-4 lg:gap-12">
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src={logo} alt="" className="h-10 w-10 shrink-0" />
              <span className="text-lg font-bold tracking-tight text-sky-800">
                Zepserve
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
              Zepserve makes it easy to book trusted professionals for garden cleaning, salon
              services, home maintenance, and more all at your doorstep.
            </p>
          </div>

          <FooterColumn title="Company" links={COMPANY_LINKS} />
          <FooterColumn title="For Customers" links={CUSTOMER_LINKS} />

          <div className="col-span-2 lg:col-span-1">
            <h3 className="text-sm font-bold text-zinc-900">Social Links</h3>
            <div className="mt-4 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-md bg-zinc-900 text-white transition hover:bg-zinc-700"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-400 sm:mt-12">
          © Copyright 2026 Zepserve All rights reserved. | CIN: L74140DL2014PLC274413
        </div>
      </div>
    </footer>
  )
}
