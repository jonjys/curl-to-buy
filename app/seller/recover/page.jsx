import { LocaleProvider } from '../../../components/locale'
import { Frame } from '../../../components/shell'
import SellerRecoverView from '../../../components/seller-recover-view'

export const dynamic = 'force-dynamic'

export default async function SellerRecoverPage({ searchParams }) {
  const params = await searchParams
  return (
    <LocaleProvider>
      <Frame>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
          <SellerRecoverView invalidToken={params?.error === 'invalid'} />
        </main>
      </Frame>
    </LocaleProvider>
  )
}
