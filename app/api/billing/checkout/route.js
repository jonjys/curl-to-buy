import { randomUUID } from 'node:crypto'
import { getSeller, updateSeller } from '../../../../lib/store'
import { withBillingLock } from '../../../../lib/commerce-store'
import { stripe } from '../../../../lib/stripe'
import { authenticatedSeller, billingState, ensureBillingIdentity, getPlans, portalConfiguration, billingEnabled } from '../../../../lib/billing'
import { readySubscriptionMerchant } from '../../../../lib/stripe-connect'
import { originFrom } from '../../../../lib/site'
import { privateJson, sameOrigin } from '../../../../lib/http'

export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(req) {
  if (!sameOrigin(req)) return privateJson({ error: 'Invalid origin.' }, 403)
  if (!billingEnabled()) return privateJson({ error: 'Subscription checkout is temporarily unavailable.' }, 503)
  try {
    const seller = await authenticatedSeller(req)
    if (!seller || !(await readySubscriptionMerchant(seller))) return privateJson({ error: 'Add your payout details first.', needsConnect: true }, 403)
    const body = await req.json().catch(() => ({}))
    const plan = (await getPlans(stripe())).find((p) => p.key === body.plan)
    if (!plan) return privateJson({ error: 'Choose a subscription plan.' }, 400)
    return await withBillingLock(seller.id, async () => {
    const client = stripe()
    const freshSeller = await getSeller(seller.id)
    const identity = await ensureBillingIdentity(freshSeller)
    const current = await billingState({ ...freshSeller, billingIdentity: identity })
    const origin = originFrom(req)
    if (current.subscriptionId) {
      const portal = await client.billingPortal.sessions.create({ ...identity, configuration: await portalConfiguration(), return_url: `${origin}/plans` })
      return privateJson({ url: portal.url })
    }
    // One open session per seller and plan. Stripe expires abandoned sessions;
    // repeated clicks do not start a second subscription.
    const open = await client.checkout.sessions.list({ ...identity, status: 'open', limit: 100 })
    const reusable = open.data.find((s) => s.mode === 'subscription' && s.metadata?.app === 'curl_to_buy' && s.metadata?.plan === plan.key && s.metadata?.seller_id === seller.id)
    if (reusable) return privateJson({ url: reusable.url })
    for (const session of open.data.filter((s) => s.mode === 'subscription' && s.metadata?.app === 'curl_to_buy' && s.metadata?.seller_id === seller.id)) await client.checkout.sessions.expire(session.id)
    let attempt = freshSeller.billingCheckout
    if (!attempt || attempt.plan !== plan.key || attempt.expiresAt <= Math.floor(Date.now() / 1000) || (attempt.sessionId && (await client.checkout.sessions.retrieve(attempt.sessionId)).status !== 'open')) {
      attempt = { plan: plan.key, nonce: randomUUID(), expiresAt: Math.floor(Date.now() / 1000) + 3600, origin }
      await updateSeller(seller.id, { billingCheckout: attempt })
    }
    const metadata = { app: 'curl_to_buy', seller_id: seller.id, plan: plan.key }
    const session = await client.checkout.sessions.create({
      mode: 'subscription', ...identity,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      billing_address_collection: 'required', tax_id_collection: { enabled: true },
      automatic_tax: { enabled: true },
      customer_update: { address: 'auto', name: 'auto' },
      metadata, subscription_data: { metadata },
      success_url: `${attempt.origin}/upload?billing=success`, cancel_url: `${attempt.origin}/plans?billing=canceled`,
      expires_at: attempt.expiresAt,
    }, { idempotencyKey: `ctb-subscription-${seller.id}-${attempt.nonce}` })
    await updateSeller(seller.id, { billingCheckout: { ...attempt, sessionId: session.id } })
    return privateJson({ url: session.url })
    })
  } catch (error) {
    console.error('Subscription checkout failed', { type: error.type || error.name })
    return privateJson({ error: 'Could not open subscription checkout. Please try again.' }, 503)
  }
}
