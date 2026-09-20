import { stripe } from '../../../../lib/stripe'
import { billingEnabled, displayPlans, getPlans } from '../../../../lib/billing'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function publicPlans(plans) {
  return plans.map(({ priceId, ...visible }) => visible)
}

export async function GET() {
  try {
    const plans = await getPlans(stripe())
    return Response.json({
      plans: publicPlans(plans),
      acceptingSubscriptions: billingEnabled(),
      source: 'stripe',
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('GetPaidLink subscription catalog unavailable', {
      mode: /_test_/.test(process.env.STRIPE_SECRET_KEY || '') ? 'test' : 'live',
      code: error.code || error.type || error.name,
      message: String(error.message || '').replace(/(?:sk|rk)_(?:live|test)_[A-Za-z0-9]+/g, '[redacted]'),
    })
    return Response.json({
      plans: publicPlans(displayPlans()),
      acceptingSubscriptions: false,
      source: 'verified_fallback',
      notice: 'Live Start / Grow / Scale prices are shown. Checkout stays closed until this deployment can read the Stripe catalog.',
    }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
