import './globals.css'
import { SITE } from '../lib/site'
import { SiteAnalytics } from '../components/analytics'

const OG = `${SITE}/og.jpg`
const title = 'Nytto Checkout | One product. One checkout link.'
const description = 'Upload a template, preset, ebook or client delivery. Set a price and share one link. Buyers pay by card. The money goes to your Stripe. 5% fee, no monthly fee.'

export const metadata = {
  metadataBase: new URL(SITE),
  title,
  description,
  applicationName: 'Nytto Checkout',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title,
    description,
    url: SITE,
    siteName: 'Nytto Checkout',
    locale: 'en_GB',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Nytto Checkout, payment links for files and things' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [OG],
  },
}

export const viewport = {
  themeColor: '#f6f0e6',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600;700;800&display=swap"
        />
      </head>
      <body className="min-h-full bg-paper text-ink">{children}<SiteAnalytics /></body>
    </html>
  )
}
