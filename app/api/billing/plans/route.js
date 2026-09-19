import { stripe } from '../../../../lib/stripe'
import { billingSandboxEnabled, getPlans } from '../../../../lib/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const client = stripe()
    if (!client) return Response.json({ error: 'Plan pricing is unavailable.' }, { status: 503 })
    const plans = await getPlans(client)
    return Response.json({ plans: plans.map(({ priceId, ...visible }) => visible),
      acceptingSubscriptions: billingSandboxEnabled(),
      sandboxOnly: true,
      note: 'These are the existing Stripe plan prices. New subscription purchases are not enabled in production.' },
      { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } })
  } catch {
    return Response.json({ error: 'Could not verify current Stripe plan prices.' }, { status: 503 })
  }
}
