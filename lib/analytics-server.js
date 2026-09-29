import { put } from '@vercel/blob'
import { safeProps } from './analytics.js'

const markerPrefix = 'analytics/purchase-completed/'
const SAFE_ID = /^[A-Za-z0-9_-]{1,240}$/

// Records `purchase_completed` once per paid Checkout session. Called only from
// the signed Stripe webhook after the purchase is registered. The marker is
// created with allowOverwrite: false, so webhook retries and the second
// payment event of a delayed method cannot count the same sale twice. Any
// failure is swallowed: analytics never affects fulfillment.
export async function trackPurchaseCompleted({ sessionId, itemType, currency }, { send } = {}) {
  try {
    if (process.env.VERCEL_ENV !== 'production' || !SAFE_ID.test(String(sessionId))) return false
    try {
      await put(`${markerPrefix}${sessionId}.json`, JSON.stringify({ at: Date.now() }), {
        access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json',
      })
    } catch { return false }
    const track = send || (await import('@vercel/analytics/server')).track
    // Only the allowlisted properties; no session, listing, seller or Stripe IDs.
    await track('purchase_completed', safeProps({ item_type: itemType, currency }), { headers: { 'user-agent': 'stripe-webhook' } })
    return true
  } catch { return false }
}
