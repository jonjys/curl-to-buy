import Link from 'next/link'
import { LocaleProvider } from '../components/locale'
import { Frame } from '../components/shell'

export default function NotFound() {
  return (
    <LocaleProvider>
      <Frame>
        <main className="ctb-gutter mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-20">
          <p className="ctb-kicker text-muted">404</p>
          <h1 className="ctb-title mt-3">This link is not for sale.</h1>
          <p lang="sv" className="mt-4 text-lg text-ink-soft">Den här länken finns inte eller är inte längre till salu.</p>
          <Link href="/" className="ctb-btn ctb-btn-dark mt-8 w-fit">Curl-to-Buy</Link>
        </main>
      </Frame>
    </LocaleProvider>
  )
}
