import { stripe } from './stripe'
import { getSeller, updateSeller } from './store'
import { sellerIdFromRequest } from './seller'

// The deployment must have both connected-account event delivery and a scoped
// billing portal configured before a seller can purchase a subscription.
export function billingEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY
    && process.env.STRIPE_CTB_CONNECT_WEBHOOK_SECRET
    && process.env.STRIPE_CTB_PORTAL_CONFIGURATION)
}

export async function authenticatedSeller(req) {
  const id = sellerIdFromRequest(req)
  return id ? getSeller(id) : null
}

const LOOKUPS = Object.freeze({
  start: 'ctb_start_monthly_v1',
  grow: 'ctb_grow_monthly_v1',
  scale: 'ctb_scale_monthly_v1',
})

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
      || price.tax_behavior !== 'inclusive'
      || !Number.isSafeInteger(price.unit_amount) || price.unit_amount < 100
      || price.metadata?.app !== 'curl_to_buy' || price.metadata?.plan !== key
      || product.metadata?.app !== 'curl_to_buy' || product.metadata?.plan !== key) {
      throw new Error(`Curl-to-Buy ${key} price is not configured correctly.`)
    }
    const monthlyLinks = safeQuota(product.metadata?.monthly_links)
    if (monthlyLinks === undefined) throw new Error(`Curl-to-Buy ${key} link limit is invalid.`)
    plans.push({ key, name: ({ start: 'Start', grow: 'Grow', scale: 'Scale' })[key], priceId: price.id, currency: price.currency,
      amount: price.unit_amount, monthlyLinks })
  }
  return plans
}


export async function ensureBillingIdentity(seller) {
  if (seller.billingIdentity) return seller.billingIdentity
  // Existing Billing customers stay attached to their original seller.
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
    return { active: subscription.status === 'active' && end * 1000 > Date.now(), plan: { ...plan, links: plan.monthlyLinks },
      subscriptionId: subscription.id, periodStart: start, periodEnd: end,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end), status: subscription.status }
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
  const id = process.env.STRIPE_CTB_PORTAL_CONFIGURATION
  if (!id) throw Error('Subscription management is not configured.')
  return id
}
