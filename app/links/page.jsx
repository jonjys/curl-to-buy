import { LocaleProvider } from '../../components/locale'
import { Frame } from '../../components/shell'
import MyProducts from '../../components/my-products'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My products | Curl-to-Buy',
  robots: { index: false, follow: false },
}

export default function LinksPage() {
  return (
    <LocaleProvider>
      <Frame>
        <main className="ctb-gutter mx-auto w-full max-w-5xl flex-1 py-10 sm:py-16">
          <MyProducts />
        </main>
      </Frame>
    </LocaleProvider>
  )
}
