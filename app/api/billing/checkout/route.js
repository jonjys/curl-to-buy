import { stripe } from '../../../../lib/stripe'
import { billingSandboxEnabled, getPlans, getCurrentSubscription } from '../../../../lib/billing'
import { getSeller, updateSeller } from '../../../../lib/store'
import { sellerIdFromRequest } from '../../../../lib/seller'
import { originFrom } from '../../../../lib/site'

export const runtime = 'nodejs'

export async function POST(req) {
  // Prevent charging a seller while the production checkout still uses destination
  // charges and charges Stripe processing fees to the Nytto Labs platform.
  if (!billingSandboxEnabled()) {
    return Response.json({ error: 'Subscriptions are not available yet. No payment has been taken.' }, { status: 503 })
  }
  const sellerId = sellerIdFromRequest(req)
  const seller = sellerId ? await getSeller(sellerId) : null
  if (!seller?.stripeAccountId || !seller.email) {
    return Response.json({ error: 'Set up your seller account first.' }, { status: 401 })
  }
  const body = await req.json().catch(() => null)
  const key = typeof body?.plan === 'string' ? body.plan : ''
  try {
    const client = stripe()
    if (!client) throw Error('Stripe is not configured.')
    const plans = await getPlans(client)
    const plan = plans.find((item) => item.key === key)
    if (!plan) return Response.json({ error: 'Unknown subscription plan.' }, { status: 400 })

    if (await getCurrentSubscription(client, seller, plans)) {
      return Response.json({ error: 'You already have a subscription. Manage it from your account.' }, { status: 409 })
    }

    let customerId = seller.stripeCustomerId
    if (!customerId) {
      const customer = await client.customers.create({
        email: seller.email,
        metadata: { ctb_seller_id: seller.id, ctb_service: 'curl_to_buy' },
      }, { idempotencyKey: `ctb-billing-customer-${seller.id}` })
      customerId = customer.id
      await updateSeller(seller.id, { stripeCustomerId: customerId })
    }

    const origin = originFrom(req)
    const session = await client.checkout.sessions.create({
      customer: customerId,
      client_reference_id: seller.id,
      mode: 'subscription',
      line_items: [{ price: plan.priceId, quantity: 1 }],
      subscription_data: { metadata: { ctb_seller_id: seller.id, ctb_plan: plan.key } },
      success_url: `${origin}/plans?checkout=success`,
      cancel_url: `${origin}/plans?checkout=cancel`,
    }, { idempotencyKey: `ctb-sub-session-${seller.id}-${plan.key}-${Math.floor(Date.now() / 60000)}` })

    return Response.json({ url: session.url }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Sandbox subscription checkout could not start.', { message: error?.message || 'Unknown error' })
    return Response.json({ error: 'Could not start subscription checkout. No payment has been taken here.' }, { status: 503 })
  }
}
