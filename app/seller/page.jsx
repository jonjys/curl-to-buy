import { cookies } from 'next/headers'
import { LocaleProvider } from '../../components/locale'
import { Frame } from '../../components/shell'
import SellerView from '../../components/seller-view'
import { getSeller, getListing } from '../../lib/store'
import { parseCookieValue, secretMatches, SELLER_COOKIE_NAME } from '../../lib/seller'
import { stripe } from '../../lib/stripe'

export const dynamic = 'force-dynamic'

export default async function SellerPage() {
  const store = await cookies()
  const raw = store.get(SELLER_COOKIE_NAME)?.value
  const parsed = parseCookieValue(raw)

  let seller = null
  if (parsed) {
    const record = await getSeller(parsed.sellerId)
    if (record && secretMatches(parsed.secret, record.secretHash)) seller = record
  }

  let status = null
  if (seller?.stripeAccountId) {
    const client = stripe()
    if (client) {
      try {
        const acct = await client.accounts.retrieve(seller.stripeAccountId)
        status = {
          chargesEnabled: Boolean(acct.charges_enabled),
          payoutsEnabled: Boolean(acct.payouts_enabled),
          detailsSubmitted: Boolean(acct.details_submitted),
        }
      } catch {
        status = null
      }
    }
  }

  let listings = []
  if (seller?.listingIds?.length) {
    const found = await Promise.all(seller.listingIds.map((id) => getListing(id)))
    listings = found.filter(Boolean)
  }

  return (
    <LocaleProvider>
      <Frame>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
          <SellerView hasSeller={Boolean(seller)} status={status} listings={listings} />
        </main>
      </Frame>
    </LocaleProvider>
  )
}
