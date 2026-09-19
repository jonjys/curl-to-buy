import { billingState } from './billing'
import { listingIdFor, reserveLink, withBillingLock } from './commerce-store'
import { getListing, saveListing } from './store'
import { isSubscribed, saleTerms } from './entitlement'
export async function publishListing(seller, body, listing) {
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(body.requestId || '')) throw Object.assign(Error('Refresh the form and try again.'), { status: 400 })
  if (body.accepted !== true) throw Object.assign(Error('Confirm your age and right to sell.'), { status: 400 })
  const id = listingIdFor(seller.id, body.requestId)
  return withBillingLock(`publish:${id}`, async () => {
  const previous = await getListing(id)
  if (previous) {
    if (previous.sellerId !== seller.id) throw Error('Listing owner mismatch.')
    return previous
  }
  const locale = body.locale === 'sv' ? 'sv' : 'en'
  const billing = await billingState(seller)
  const terms = saleTerms(isSubscribed(billing))
  if (listing.priceUsd != null && Number(listing.priceUsd) < terms.minUsd) {
    throw Object.assign(Error(locale === 'sv' ? `Priset måste vara minst $${terms.minUsd}.` : `Price must be at least $${terms.minUsd}.`), { status: 400 })
  }
  if (listing.priceSek != null && Number(listing.priceSek) < terms.minSek) {
    throw Object.assign(Error(locale === 'sv' ? `Priset måste vara minst ${terms.minSek} kr.` : `Price must be at least ${terms.minSek} SEK.`), { status: 400 })
  }
  if (billing.active) await reserveLink(seller.id, { ...billing, locale }, id)
  const created = { ...listing, id, sellerId: seller.id, paymentAccountId: seller.paymentAccountId,
    billingMode: terms.billingMode, feeBps: terms.feeBps, createdAt: Date.now() }
  // An identical request ID consumes one quota slot even when a process dies
  // between reserving the slot and saving the listing.
  await saveListing(created)
  return created
  })
}
