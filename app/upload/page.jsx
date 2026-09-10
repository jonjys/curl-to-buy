import { LocaleProvider } from '../../components/locale'
import { Frame } from '../../components/shell'
import { stripeReady } from '../../lib/stripe'
import { MAX_MB } from '../../lib/site'
import UploadCopy from './copy'

export const dynamic = 'force-dynamic'

export default function UploadPage() {
  return (
    <LocaleProvider>
      <Frame>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
          <UploadCopy
            stripeReady={stripeReady()}
            blobReady={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
            maxMB={MAX_MB}
          />
        </main>
      </Frame>
    </LocaleProvider>
  )
}
