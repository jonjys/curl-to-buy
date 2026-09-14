import { stripe } from '../../../../lib/stripe'
import { getListing, getSalesCount, getSeller, listingFiles } from '../../../../lib/store'
import { displayPrice } from '../../../../lib/price'
import { applicationFeeCents } from '../../../../lib/fees'
import { recipientStatus, retrieveConnectedRecipient } from '../../../../lib/stripe-connect'

export const runtime = 'nodejs'

export async function POST(req, { params }) {
  const { id } = await params
  const origin = new URL(req.url).origin
  const client = stripe()
  if (!client) return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })

  const listing = await getListing(id)
  if (!listing) return Response.json({ error: 'This link is not for sale.' }, { status: 404 })
  const seller = listing.sellerId ? await getSeller(listing.sellerId) : null
  if (!seller?.stripeAccountId) {
    return Response.json({ error: 'The seller has not connected payouts yet.' }, { status: 409 })
  }

  try {
    const status = recipientStatus(await retrieveConnectedRecipient(seller.stripeAccountId))
    if (!status.transfers) {
      return Response.json({ error: 'The seller is still completing Stripe setup.' }, { status: 409 })
    }
  } catch {
    return Response.json({ error: 'Could not verify the seller payout account.' }, { status: 502 })
  }

  if (Number.isInteger(listing.salesLimit)) {
    const sold = await getSalesCount(id)
    if (sold >= listing.salesLimit) {
      return Response.json({ error: 'Sold out — this link reached its purchase limit.' }, { status: 410 })
    }
  }

  const price = displayPrice(listing)
  const min = price.currency === 'usd' ? 500 : 5000
  if (!price.amount || price.amount < min) {
    return Response.json({ error: 'Price must be at least $5.' }, { status: 400 })
  }

  const fileCount = listingFiles(listing).length
  const session = await client.checkout.sessions.create({
    mode: 'payment',
    integration_identifier: 'ctobuyxx',
    line_items: [{
      quantity: 1,
      price_data: {
        currency: price.currency,
        unit_amount: price.amount,
        product_data: {
          name: listing.name,
          description: fileCount > 1 ? `${fileCount} digital files via Curl-to-Buy` : 'Digital file via Curl-to-Buy',
        },
      },
    }],
    payment_intent_data: {
      application_fee_amount: applicationFeeCents(price.amount, seller.feeBps || 500),
      transfer_data: { destination: seller.stripeAccountId },
    },
    success_url: `${origin}/success?listing_id=${listing.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dl/${listing.id}`,
    metadata: { file_id: listing.id },
  })

  return Response.json({ url: session.url })
}
