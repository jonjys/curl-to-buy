import { createHash } from 'node:crypto'
import { get, put } from '@vercel/blob'
import { getSeller, updateSeller } from './store'
import { withBillingLock } from './commerce-store'

const EVENTS = new Set(['customer.subscription.created', 'customer.subscription.updated',
  'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed', 'checkout.session.completed'])
const idOf = (value) => typeof value === 'string' ? value : value?.id

// Entitlements remain a live Stripe read. Events only reconcile a seller's status;
// a stale or duplicated event can never grant a plan or resurrect a canceled plan.
export async function reconcileBillingEvent(client, event) {
  if (!EVENTS.has(event.type) || event.account) return false
  const object = event.data.object
  if (event.type === 'checkout.session.completed' && object.mode !== 'subscription') return false
  const id = event.type.startsWith('customer.subscription.') ? object.id
    : idOf(object.subscription || object.parent?.subscription_details?.subscription)
  if (!id) return false
  const subscription = await client.subscriptions.retrieve(id)
  if (subscription.metadata?.app !== 'curl_to_buy') return false
  const sellerId = subscription.metadata.seller_id
  if (!sellerId) throw Error('Subscription owner is missing.')
  const expectedLive = /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || '')
  if (event.livemode !== expectedLive || subscription.livemode !== expectedLive) throw Error('Subscription mode mismatch.')
  const path = `billing-events/${createHash('sha256').update(event.id).digest('hex')}.json`
  return withBillingLock(`billing-event:${sellerId}`, async () => {
    const previous = await get(path, { access: 'public', useCache: false })
    if (previous?.statusCode === 200) return true
    if (previous) throw Error('Billing event state unavailable.')
    const seller = await getSeller(sellerId)
    const identity = seller?.billingIdentity
    if (!identity || (identity.customer && identity.customer !== idOf(subscription.customer))
      || (identity.customer_account && identity.customer_account !== idOf(subscription.customer_account))) {
      throw Error('Subscription customer does not match seller.')
    }
    // Retrieve inside the lock: processing order does not determine billing status.
    const current = await client.subscriptions.retrieve(id)
    await updateSeller(sellerId, { billingSnapshot: {
      subscriptionId: current.id, status: current.status,
      cancelAtPeriodEnd: Boolean(current.cancel_at_period_end), checkedAt: Date.now(),
    } })
    await put(path, JSON.stringify({ processed: true }), {
      access: 'public', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json',
    })
    return true
  })
}
