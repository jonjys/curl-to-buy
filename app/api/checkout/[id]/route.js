import { stripe } from '../../../../lib/stripe'
import { getListing, getSalesCount, listingFiles } from '../../../../lib/store'
import { displayPrice } from '../../../../lib/price'
import { SITE } from '../../../../lib/site'

export const runtime = 'nodejs'

export async function POST(_req, { params }) {
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
  const min = price.currency === 'usd' ? 100 : 300
  if (!price.amount || price.amount < min) {
    return Response.json({ error: 'Price must be at least $1.' }, { status: 400 })
  }

  const fileCount = listingFiles(listing).length
  const session = await client.checkout.sessions.create({
    mode: 'payment',
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
    success_url: `${SITE}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE}/dl/${listing.id}`,
    metadata: { file_id: listing.id },
  })

  return Response.json({ url: session.url })
}
