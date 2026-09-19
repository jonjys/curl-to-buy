import { stripe } from './stripe'
import { getSeller, updateSeller } from './store'
import { sellerIdFromRequest } from './seller'

// Live catalog rechecked 19 September 2026. Do not invent a fourth tier.
export const VERIFIED_PLANS = Object.freeze({
  start: { lookup: 'ctb_start_monthly_v1', priceId: 'price_1UH94rBEo0YzuylwfRdX935C', amount: 500, monthlyLinks: 10 },
  grow: { lookup: 'ctb_grow_monthly_v1', priceId: 'price_1UH95ABEo0Yzuylw3qTlybUT', amount: 1900, monthlyLinks: 50 },
  scale: { lookup: 'ctb_scale_monthly_v1', priceId: 'price_1UH95BBEo0Yzuylw7V505tem', amount: 4900, monthlyLinks: null },
})

const NAMES = Object.freeze({ start: 'Start', grow: 'Grow', scale: 'Scale' })

export function billingEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function displayPlans() {
  return Object.entries(VERIFIED_PLANS).map(([key, spec]) => ({
    key,
    name: NAMES[key],
    priceId: spec.priceId,
    currency: 'eur',
    amount: spec.amount,
    monthlyLinks: spec.monthlyLinks,
  }))
}

export async function authenticatedSeller(req) {
  const id = sellerIdFromRequest(req)
  return id ? getSeller(id) : null
}

function safeQuota(raw) {
  if (raw === 'unlimited') return null
  const count = Number(raw)
  return Number.isSafeInteger(count) && count > 0 && count <= 100000 ? count : undefined
}

function planFromListedPrice(key, price) {
  const product = price?.product
  if (!price || !product || typeof product === 'string'
    || price.currency !== 'eur' || price.recurring?.interval !== 'month'
    || price.recurring?.interval_count !== 1
    || price.tax_behavior !== 'inclusive'
    || !Number.isSafeInteger(price.unit_amount) || price.unit_amount < 100
    || price.metadata?.app !== 'curl_to_buy' || price.metadata?.plan !== key
    || product.metadata?.app !== 'curl_to_buy' || product.metadata?.plan !== key) {
    throw new Error(`Curl-to-Buy ${key} price is not configured correctly.`)
  }
  const monthlyLinks = safeQuota(product.metadata?.monthly_links)
  if (monthlyLinks === undefined) throw new Error(`Curl-to-Buy ${key} link limit is invalid.`)
  return { key, name: NAMES[key], priceId: price.id, currency: price.currency, amount: price.unit_amount, monthlyLinks }
}

async function getPlansById(client) {
  const plans = []
  for (const [key, spec] of Object.entries(VERIFIED_PLANS)) {
    const price = await client.prices.retrieve(spec.priceId, { expand: ['product'] })
    const plan = planFromListedPrice(key, price)
    if (price.id !== spec.priceId || price.lookup_key !== spec.lookup || plan.amount !== spec.amount || plan.monthlyLinks !== spec.monthlyLinks) {
      throw new Error(`Curl-to-Buy ${key} price is not configured correctly.`)
    }
    plans.push(plan)
  }
  return plans
}

async function getPlansByLookup(client) {
  const response = await client.prices.list({
    active: true,
    type: 'recurring',
    lookup_keys: Object.values(VERIFIED_PLANS).map((spec) => spec.lookup),
    expand: ['data.product'],
    limit: 10,
  })
  return Object.keys(VERIFIED_PLANS).map((key) => {
    const price = response.data.find((item) => item.lookup_key === VERIFIED_PLANS[key].lookup)
    return planFromListedPrice(key, price)
  })
}

export async function getPlans(client) {
  if (!client) throw new Error('Stripe is unavailable.')
  if (typeof client.prices?.retrieve === 'function') {
    try {
      return await getPlansById(client)
    } catch {
      // Preview or test keys cannot read live Price IDs. Fall through to lookup keys.
    }
  }
  return getPlansByLookup(client)
}

export async function ensureBillingIdentity(seller) {
  if (seller.billingIdentity) return seller.billingIdentity
  const identity = seller.stripeCustomerId
    ? { customer: seller.stripeCustomerId }
    : { customer_account: seller.paymentAccountId }
  if (!identity.customer && !identity.customer_account) throw Error('Finish Stripe setup first.')
  await updateSeller(seller.id, { billingIdentity: identity })
  return identity
}

export async function getCurrentSubscription(client, seller, plans) {
  const identity = seller?.billingIdentity || (seller?.stripeCustomerId ? { customer: seller.stripeCustomerId } : null)
  if (!identity) return null
  const result = await client.subscriptions.list({ ...identity, status: 'all', limit: 100 })
  for (const subscription of result.data) {
    const meta = subscription.metadata || {}
    if ((meta.seller_id || meta.ctb_seller_id) !== seller.id) continue
    const items = subscription.items?.data || []
    if (items.length !== 1 || items[0].quantity !== 1) continue
    const plan = plans.find((p) => p.priceId === items[0].price?.id)
    const start = items[0].current_period_start ?? subscription.current_period_start
    const end = items[0].current_period_end ?? subscription.current_period_end
    if (!plan || !start || !end) continue
    if (['canceled', 'incomplete_expired'].includes(subscription.status)) continue
    return {
      active: subscription.status === 'active' && end * 1000 > Date.now(),
      plan: { ...plan, links: plan.monthlyLinks },
      subscriptionId: subscription.id,
      periodStart: start,
      periodEnd: end,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      status: subscription.status,
    }
  }
  return null
}

export async function billingState(seller) {
  const client = stripe()
  if (!client) throw Error('Stripe is unavailable.')
  if (!seller?.billingIdentity && !seller?.stripeCustomerId) return { active: false, plan: null }
  return await getCurrentSubscription(client, seller, await getPlans(client)) || { active: false, plan: null }
}

export function portalConfiguration() {
  return process.env.STRIPE_CTB_PORTAL_CONFIGURATION || null
}
