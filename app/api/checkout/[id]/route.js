import { stripe } from '../../../../lib/stripe'
import { getListing, getSeller } from '../../../../lib/store'
import { displayPrice } from '../../../../lib/price'
import { SITE, FEE } from '../../../../lib/site'

export const runtime = 'nodejs'

export async function POST(_req, { params }) {
  const { id } = await params
  const client = stripe()
  if (!client) {
    return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })
  }
  const listing = await getListing(id)
  if (!listing) {
    return Response.json({ error: 'This link is not for sale.' }, { status: 404 })
  }
  const price = displayPrice(listing)
  const min = price.currency === 'usd' ? 100 : 300
  if (!price.amount || price.amount < min) {
    return Response.json({ error: 'Price must be at least $1.' }, { status: 400 })
  }

  // Marketplace: money only ever flows to a seller resolved from the
  // listing's sellerId (set by the seller themselves, from their own cookie
  // — see /api/connect). A listing with no sellerId (e.g. one created
  // before payouts were connected) is never routed to any default or
  // fallback destination; it simply can't be bought yet.
  if (!listing.sellerId) {
    return Response.json({ error: 'This file is not ready for sale yet.' }, { status: 409 })
  }
  const seller = await getSeller(listing.sellerId)
  if (!seller?.stripeAccountId) {
    return Response.json({ error: 'The seller has not finished payout setup yet.' }, { status: 409 })
  }

  // Check live, not the cached flags — a buyer paying in is where it matters
  // most that a since-restricted account doesn't still look "ready".
  // chargesEnabled and payoutsEnabled are deliberately both required:
  // an account can accept charges before Stripe will actually pay it out.
  try {
    const acct = await client.accounts.retrieve(seller.stripeAccountId)
    if (!acct.charges_enabled || !acct.payouts_enabled) {
      return Response.json({ error: 'The seller has not finished payout setup yet.' }, { status: 409 })
    }
  } catch {
    return Response.json({ error: 'The seller has not finished payout setup yet.' }, { status: 409 })
  }

  const applicationFee = Math.round(price.amount * FEE)

  const session = await client.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: price.currency,
          unit_amount: price.amount,
          product_data: {
            name: listing.name,
            description: 'Digital file via Curl-to-Buy',
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: { destination: seller.stripeAccountId },
    },
    success_url: `${SITE}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE}/dl/${listing.id}`,
    metadata: { file_id: listing.id },
  })

  return Response.json({ url: session.url })
}
