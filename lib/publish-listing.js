import { billingState } from './billing'
import { listingIdFor, reserveLink, withBillingLock } from './commerce-store'
import { getListing, saveListing } from './store'
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
  const billing = await billingState(seller)
  if (!billing.active) throw Object.assign(Error('Choose a subscription to publish your link.'), { status: 402, needsPlan: true })
  await reserveLink(seller.id, billing, id)
  const created = { ...listing, id, sellerId: seller.id, paymentAccountId: seller.paymentAccountId,
    billingMode: 'subscription', feeBps: 0, createdAt: Date.now() }
  // An identical request ID consumes one quota slot even when a process dies
  // between reserving the slot and saving the listing.
  await saveListing(created)
  return created
  })
}
