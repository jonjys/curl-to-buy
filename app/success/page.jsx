import { Suspense } from 'react'
import { LocaleProvider } from '../../components/locale'
import { Frame } from '../../components/shell'
import SuccessBox from './box'

export const dynamic = 'force-dynamic'

export default function SuccessPage() {
  return (
    <LocaleProvider>
      <Frame>
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
          <Suspense fallback={<p className="text-sm text-muted">Checking payment…</p>}>
            <SuccessBox />
          </Suspense>
        </main>
      </Frame>
    </LocaleProvider>
  )
}
