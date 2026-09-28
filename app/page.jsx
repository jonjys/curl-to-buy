import Home from '../components/home'
import { stripeReady } from '../lib/stripe'
import { MAX_MB } from '../lib/site'

export const dynamic = 'force-dynamic'

const title = 'Curl-to-Buy | Sell anything with one link'
const description = 'Upload a file or add an item, set a price and share one link. Buyers pay by card and need no account.'
const image = { url: '/og.jpg', width: 1200, height: 630, alt: 'Curl-to-Buy, payment links for files and things' }
// Page metadata replaces the layout's openGraph/twitter objects, so repeat the image.
export const metadata = {
  title,
  description,
  openGraph: { title, description, url: '/', siteName: 'Curl-to-Buy', type: 'website', images: [image] },
  twitter: { card: 'summary_large_image', title, description, images: [image.url] },
}

export default function Page() {
  return (
    <Home
      stripeReady={stripeReady()}
      blobReady={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
      maxMB={MAX_MB}
    />
  )
}
