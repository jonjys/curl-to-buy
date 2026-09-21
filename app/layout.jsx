import './globals.css'
import { SITE } from '../lib/site'

const OG = `${SITE}/og.jpg`
const title = 'Curl-to-Buy — Sell an item or file with one link.'
const description = 'Sell a hoodie, stroller or digital file with a shareable payment link. Buyers pay by card through Stripe without creating a buyer account.'

export const metadata = {
  metadataBase: new URL(SITE),
  title,
  description,
  applicationName: 'Curl-to-Buy',
  openGraph: {
    title,
    description,
    url: SITE,
    siteName: 'Curl-to-Buy — Nytto Labs',
    locale: 'en_GB',
    type: 'website',
    images: [{ url: OG, width: 1200, height: 630, alt: 'Curl-to-Buy — shareable payment links' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [OG],
  },
}

export const viewport = {
  themeColor: '#0c1018',
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
      <body className="min-h-full bg-paper text-ink">{children}</body>
    </html>
  )
}
