// Billing is deliberately test-only until Connect direct charges and seller fee
// responsibility are migrated and verified. No production subscription can be
// purchased merely by enabling a UI switch.
const LOOKUPS = Object.freeze({
  start: 'ctb_start_monthly_v1',
  grow: 'ctb_grow_monthly_v1',
  scale: 'ctb_scale_monthly_v1',
})

export function billingSandboxEnabled() {
  return process.env.CTB_BILLING_SANDBOX_ENABLED === 'true'
    && process.env.CTB_BILLING_STORAGE_ISOLATED === 'true'
    && /^sk_test_/.test(process.env.STRIPE_SECRET_KEY || '')
}

function safeQuota(raw) {
  if (raw === 'unlimited') return null
  const count = Number(raw)
  return Number.isSafeInteger(count) && count > 0 && count <= 100000 ? count : undefined
}

export async function getPlans(client) {
  if (!client) throw new Error('Stripe is unavailable.')
  const response = await client.prices.list({
    active: true,
    type: 'recurring',
    lookup_keys: Object.values(LOOKUPS),
    expand: ['data.product'],
    limit: 10,
  })
  const plans = []
  for (const [key, lookup] of Object.entries(LOOKUPS)) {
    const price = response.data.find((item) => item.lookup_key === lookup)
    const product = price?.product
    if (!price || !product || typeof product === 'string'
      || price.currency !== 'eur' || price.recurring?.interval !== 'month'
      || price.recurring?.interval_count !== 1
      || !Number.isSafeInteger(price.unit_amount) || price.unit_amount < 100
      || price.metadata?.app !== 'curl_to_buy' || price.metadata?.plan !== key
      || product.metadata?.app !== 'curl_to_buy' || product.metadata?.plan !== key) {
      throw new Error(`Curl-to-Buy ${key} price is not configured correctly.`)
    }
    const monthlyLinks = safeQuota(product.metadata?.monthly_links)
    if (monthlyLinks === undefined) throw new Error(`Curl-to-Buy ${key} link limit is invalid.`)
    plans.push({ key, name: product.name, priceId: price.id, currency: price.currency,
      amount: price.unit_amount, monthlyLinks })
  }
  return plans
}

export async function getCurrentSubscription(client, seller, plans) {
  if (!seller?.stripeCustomerId) return null
  const result = await client.subscriptions.list({ customer: seller.stripeCustomerId,
    status: 'all', limit: 30 })
  const candidates = result.data.filter((sub) => sub.status === 'active' || sub.status === 'trialing')
  for (const subscription of candidates) {
    const priceIds = subscription.items?.data?.map((item) => item.price?.id) || []
    const plan = plans.find((item) => priceIds.includes(item.priceId))
    if (plan) {
      return { plan: plan.key, status: subscription.status, monthlyLinks: plan.monthlyLinks,
        cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
        subscriptionId: subscription.id }
    }
  }
  return null
}
