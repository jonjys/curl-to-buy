import { stripe } from '../../../../lib/stripe'
import { getPlans, getCurrentSubscription, billingSandboxEnabled } from '../../../../lib/billing'
import { getSeller } from '../../../../lib/store'
import { sellerIdFromRequest } from '../../../../lib/seller'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const id = sellerIdFromRequest(req)
  const seller = id ? await getSeller(id) : null
  if (!seller) return Response.json({ error: 'Seller sign-in required.' }, { status: 401 })
  try {
    const client = stripe()
    if (!client) throw Error('Stripe unavailable')
    const plans = await getPlans(client)
    const subscription = await getCurrentSubscription(client, seller, plans)
    return Response.json({ subscription, acceptingSubscriptions: billingSandboxEnabled() }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return Response.json({ error: 'Could not verify subscription status.' }, { status: 503 })
  }
}
