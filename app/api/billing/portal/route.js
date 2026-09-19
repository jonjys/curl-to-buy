import { stripe } from '../../../../lib/stripe'
import { billingSandboxEnabled } from '../../../../lib/billing'
import { getSeller } from '../../../../lib/store'
import { sellerIdFromRequest } from '../../../../lib/seller'
import { originFrom } from '../../../../lib/site'

export const runtime = 'nodejs'

export async function POST(req) {
  if (!billingSandboxEnabled()) {
    return Response.json({ error: 'Subscription management is not live yet.' }, { status: 503 })
  }
  const sellerId = sellerIdFromRequest(req)
  const seller = sellerId ? await getSeller(sellerId) : null
  if (!seller?.stripeCustomerId) return Response.json({ error: 'No seller billing account found.' }, { status: 401 })
  try {
    const client = stripe()
    if (!client) throw Error('Stripe unavailable')
    const customer = await client.customers.retrieve(seller.stripeCustomerId)
    if (customer.deleted || customer.metadata?.ctb_seller_id !== seller.id) {
      return Response.json({ error: 'Billing account ownership could not be verified.' }, { status: 403 })
    }
    const session = await client.billingPortal.sessions.create({
      customer: seller.stripeCustomerId,
      return_url: `${originFrom(req)}/plans`,
    })
    return Response.json({ url: session.url }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return Response.json({ error: 'Could not open subscription management. Try again later.' }, { status: 503 })
  }
}
