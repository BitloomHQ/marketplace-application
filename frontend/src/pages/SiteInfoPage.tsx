import { Link, Navigate } from 'react-router-dom'
import { GuestHeader } from '../components/GuestHeader'
import { SiteFooter } from '../components/SiteFooter'

const PAGES: Record<string, { title: string; body: string[] }> = {
  about: {
    title: 'About Us',
    body: [
      'Zepserve connects households with verified professionals for garden care, salon services, home maintenance, and more — all at your doorstep.',
      'We built the marketplace so booking a trusted expert is as simple as choosing a service, sharing your address, and reviewing quotes from nearby pros.',
    ],
  },
  investors: {
    title: 'Investor Relations',
    body: [
      'Zepserve is growing a trusted home-services marketplace across categories and cities.',
      'For partnership or investor inquiries, please reach us through the Contact Us page.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'We collect the information needed to create your account, match you with professionals, and complete bookings — such as your name, contact details, and saved addresses.',
      'We do not sell your personal data. Service details are shared only with the professionals involved in your request so they can quote and deliver the job.',
      'You can update or remove account information from your profile at any time.',
    ],
  },
  careers: {
    title: 'Careers',
    body: [
      'We are always looking for people who care about reliable local services and great product experiences.',
      'If you would like to join the team, send a note through Contact Us and tell us how you would like to contribute.',
    ],
  },
  reviews: {
    title: 'Zepserve Review',
    body: [
      'After a booking is completed, customers can review the professional they hired.',
      'Reviews help neighbours choose trusted experts and help providers build a reputation on the platform.',
    ],
  },
  categories: {
    title: 'Categories Near You',
    body: [
      'Browse active service categories on the homepage to find professionals available in your area.',
      'New categories appear in New and noteworthy as they launch, so you can be first in line when they go live.',
    ],
  },
  contact: {
    title: 'Contact Us',
    body: [
      'Need help with a booking, your account, or becoming a partner? We are here to help.',
      'Email us at support@zepserve.app and include your registered email so we can look up your request quickly.',
    ],
  },
}

type Props = {
  slug: keyof typeof PAGES
}

export function SiteInfoPage({ slug }: Props) {
  const page = PAGES[slug]
  if (!page) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <GuestHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
        <p className="text-sm font-semibold text-sky-600">
          <Link to="/" className="hover:text-sky-700">
            Home
          </Link>
          <span className="mx-2 text-zinc-300">/</span>
          {page.title}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900">{page.title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-zinc-600 sm:text-base">
          {page.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
