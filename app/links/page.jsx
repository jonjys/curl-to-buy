import { LocaleProvider } from '../../components/locale'
import { Frame } from '../../components/shell'
import SavedLinks from '../../components/saved-links'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Saved links — Curl-to-Buy',
  robots: { index: false, follow: false },
}

export default function LinksPage() {
  return (
    <LocaleProvider>
      <Frame>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:px-6">
          <SavedLinks />
        </main>
      </Frame>
    </LocaleProvider>
  )
}
