import { stripe } from '../../../../lib/stripe'
import { billingEnabled, getPlans } from '../../../../lib/billing'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  try {
    const plans = await getPlans(stripe())
    return Response.json({ plans: plans.map(({ priceId, ...visible }) => visible), acceptingSubscriptions: billingEnabled() },
      { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Curl-to-Buy subscription catalog unavailable', {
      mode: /_test_/.test(process.env.STRIPE_SECRET_KEY || '') ? 'test' : 'live',
      code: error.code || error.type || error.name,
      message: String(error.message || '').replace(/(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+/g, '[redacted]'),
    })
    return Response.json({ error: 'Plan pricing is temporarily unavailable. Please try again shortly.', code: 'catalog_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
