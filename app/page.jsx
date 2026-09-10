import Home from '../components/home'
import { stripeReady } from '../lib/stripe'
import { MAX_MB } from '../lib/site'

export const dynamic = 'force-dynamic'

export default function Page() {
  return (
    <Home
      stripeReady={stripeReady()}
      blobReady={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
      maxMB={MAX_MB}
    />
  )
}
