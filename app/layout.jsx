import './globals.css'
import { SITE } from '../lib/site'

export const metadata = {
  metadataBase: new URL(SITE),
  title: 'Curl-to-Buy — Post a file. Get paid.',
  description:
    'Upload a file. Set a dollar price. Share the link. Buyers pay by card through Stripe. You keep 95%.',
  applicationName: 'Curl-to-Buy',
  openGraph: {
    title: 'Curl-to-Buy — Post a file. Get paid.',
    description:
      'Upload a file. Set a dollar price. Share the link. Buyers pay by card through Stripe. You keep 95%.',
    url: SITE,
    siteName: 'Curl-to-Buy — Nytto Labs',
    locale: 'en_GB',
    type: 'website',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'Curl-to-Buy — Post a file. Get paid.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Curl-to-Buy — Post a file. Get paid.',
    description:
      'Upload a file. Set a dollar price. Share the link. Buyers pay by card through Stripe. You keep 95%.',
    images: ['/og.jpg'],
  },
}

export const viewport = {
  themeColor: '#f4efe6',
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
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-full bg-paper text-ink">{children}</body>
    </html>
  )
}
