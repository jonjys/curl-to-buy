import { LocaleProvider } from '../../components/locale'
import { Frame } from '../../components/shell'
import LegalView from '../../components/legal-view'

export const metadata = { title: 'Refunds — Curl-to-Buy' }

export default function Page() {
  return (
    <LocaleProvider>
      <Frame>
        <main className="flex-1">
          <LegalView slug="refunds" />
        </main>
      </Frame>
    </LocaleProvider>
  )
}
