import { stripe } from '../../../../lib/stripe'
import { getListing, getSalesCount, getSeller, listingFiles } from '../../../../lib/store'
import { displayPrice } from '../../../../lib/price'
import { originFrom } from '../../../../lib/site'
import { applicationFeeCents } from '../../../../lib/fees'
import { recipientStatus, retrieveConnectedRecipient } from '../../../../lib/stripe-connect'

export const runtime = 'nodejs'

export async function POST(req, { params }) {
  const { id } = await params
  const client = stripe()
  if (!client) return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })

  const listing = await getListing(id)
  if (!listing) return Response.json({ error: 'This link is not for sale.' }, { status: 404 })

  if (Number.isInteger(listing.salesLimit)) {
    const sold = await getSalesCount(id)
    if (sold >= listing.salesLimit) {
      return Response.json({ error: 'Sold out — this link reached its purchase limit.' }, { status: 410 })
    }
  }

  const price = displayPrice(listing)
  if (!price.amount || price.amount < 100) {
    return Response.json({ error: 'This link does not have a valid price.' }, { status: 400 })
  }

  const seller = listing.sellerId ? await getSeller(listing.sellerId) : null
  let destination = null
  let feeBps = seller?.feeBps || 500
  if (seller?.stripeAccountId) {
    try {
      const status = recipientStatus(await retrieveConnectedRecipient(seller.stripeAccountId))
      if (status.transfers) destination = seller.stripeAccountId
    } catch {}
  }

  const origin = originFrom(req)
  const fileCount = listingFiles(listing).length
  const session = await client.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
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
    ...(destination
      ? {
          payment_intent_data: {
            application_fee_amount: applicationFeeCents(price.amount, feeBps),
            transfer_data: { destination },
          },
        }
      : {}),
    success_url: `${origin}/success?listing_id=${listing.id}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/dl/${listing.id}`,
    metadata: {
      file_id: listing.id,
      seller_id: seller?.id || '',
      payout: destination ? 'connect' : 'platform',
      fee_bps: destination ? String(feeBps) : '0',
    },
  })

  return Response.json({ url: session.url })
}
