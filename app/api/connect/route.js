import { stripe } from '../../../lib/stripe'
import {
  getListing,
  updateListing,
  getSeller,
  saveSeller,
  updateSeller,
  saveAccountIndex,
} from '../../../lib/store'
import { SITE } from '../../../lib/site'
import {
  newSellerId,
  newSellerSecret,
  hashSecret,
  cookieValue,
  sellerCookieHeader,
  currentSellerFromRequest,
} from '../../../lib/seller'

export const runtime = 'nodejs'

// Start (or resume) Stripe Express onboarding for the CALLER's seller
// account — identified only by the possession-based cookie, never by a
// listing id from the request body. A listing id may be included to tag
// which listing this seller's payouts should apply to, but it only ever
// grants "attach my own seller id to this listing", and only if the
// listing isn't already claimed by a different seller.
export async function POST(req) {
  const client = stripe()
  if (!client) {
    return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })
  }

  const body = await req.json().catch(() => ({}))
  const listingId = typeof body.listingId === 'string' ? body.listingId : null

  let seller = await currentSellerFromRequest(req, { getSeller })
  let setCookie = null

  if (!seller) {
    const id = newSellerId()
    const secret = newSellerSecret()
    seller = {
      id,
      secretHash: hashSecret(secret),
      stripeAccountId: null,
      chargesEnabled: false,
      payoutsEnabled: false,
      detailsSubmitted: false,
      listingIds: [],
      createdAt: Date.now(),
    }
    await saveSeller(seller)
    setCookie = sellerCookieHeader(cookieValue(id, secret))
  }

  if (listingId) {
    const listing = await getListing(listingId)
    if (!listing) {
      return withCookie(Response.json({ error: 'This link is not for sale.' }, { status: 404 }), setCookie)
    }
    if (listing.sellerId && listing.sellerId !== seller.id) {
      return withCookie(
        Response.json({ error: 'This listing is already linked to a different seller.' }, { status: 403 }),
        setCookie,
      )
    }
    if (listing.sellerId !== seller.id) {
      await updateListing(listingId, { sellerId: seller.id })
      if (!seller.listingIds.includes(listingId)) {
        seller = (await updateSeller(seller.id, { listingIds: [...seller.listingIds, listingId] })) || seller
      }
    }
  }

  try {
    let accountId = seller.stripeAccountId
    if (!accountId) {
      const account = await client.accounts.create(
        { type: 'express', metadata: { seller_id: seller.id } },
        // Best-effort de-dupe: if a double-click races two requests before
        // either has received the seller cookie yet, they'd otherwise create
        // two separate seller records/accounts. This alone can't fully close
        // that window (Blob storage has no atomic compare-and-swap), so the
        // client also disables the button while a request is in flight.
        { idempotencyKey: `connect-create-account-${seller.id}` },
      )
      accountId = account.id
      seller = (await updateSeller(seller.id, { stripeAccountId: accountId })) || seller
      await saveAccountIndex(accountId, seller.id)
    }
    const link = await client.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE}/api/connect/refresh`,
      return_url: `${SITE}/seller`,
      type: 'account_onboarding',
    })
    return withCookie(Response.json({ url: link.url }), setCookie)
  } catch (err) {
    return withCookie(
      Response.json(
        { error: err?.message || 'Could not start payout setup. Connect may not be enabled yet.' },
        { status: 500 },
      ),
      setCookie,
    )
  }
}

function withCookie(res, setCookie) {
  if (setCookie) res.headers.append('Set-Cookie', setCookie)
  return res
}
