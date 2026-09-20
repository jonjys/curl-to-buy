import { LocaleProvider } from '../../components/locale'
import { Frame } from '../../components/shell'
import LegalView from '../../components/legal-view'

export const metadata = { title: 'Terms — GetPaidLink' }

export default function Page() {
  return (
    <LocaleProvider>
      <Frame>
        <main className="flex-1">
          <LegalView slug="terms" />
        </main>
      </Frame>
    </LocaleProvider>
  )
}
