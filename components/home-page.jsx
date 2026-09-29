import Home from './home'
import { stripeReady } from '../lib/stripe'
import { MAX_MB } from '../lib/site'
import { campaignSource } from '../lib/analytics'

const title = 'Nytto Checkout | One product. One checkout link.'
const description = 'Upload a file or add an item, set a price and share one link. Buyers pay by card and need no account.'
const image = { url: '/og.jpg', width: 1200, height: 630, alt: 'Nytto Checkout, payment links for files and things' }

// Page metadata replaces the layout's openGraph/twitter objects, so repeat the image.
export const homeMetadata = {
  title,
  description,
  openGraph: { title, description, url: '/', siteName: 'Nytto Checkout', type: 'website', images: [image] },
  twitter: { card: 'summary_large_image', title, description, images: [image.url] },
}

// Campaign paths (/threads, /instagram, /x, /tiktok) show the same landing
// page. They count as their own path in Web Analytics, point search engines
// at the home page and are kept out of the index.
export function campaignMetadata() {
  return {
    ...homeMetadata,
    alternates: { canonical: 'https://pay.nyttolabs.com/' },
    robots: { index: false, follow: true },
  }
}

export function HomePage({ campaign = null }) {
  return (
    <Home
      stripeReady={stripeReady()}
      blobReady={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
      maxMB={MAX_MB}
      campaign={campaignSource(campaign)}
    />
  )
}
