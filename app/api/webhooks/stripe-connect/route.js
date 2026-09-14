import { stripe } from '../../../../lib/stripe'
import { getSellerIdByAccountId, updateSeller } from '../../../../lib/store'

export const runtime = 'nodejs'

// Stripe Connect webhook. Requires a Connect webhook endpoint created in the
// Stripe Dashboard (Developers -> Webhooks -> Add endpoint -> "Listen to
// events on Connected accounts") pointing at this URL, subscribed at least
// to account.updated, with its signing secret set as
// STRIPE_CONNECT_WEBHOOK_SECRET. This keeps seller payout status correct
// even if the seller never returns to /seller after finishing onboarding
// (the account.updated event fires from Stripe's side either way).
//
// Idempotent by construction: it always overwrites the seller's cached
// status with the current state from the event, so redelivery of the same
// (or a stale, out-of-order) event is harmless — it just re-asserts a
// snapshot of account state, not an incremental change.
export async function POST(req) {
  const client = stripe()
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  if (!client || !secret) {
    return Response.json({ error: 'Webhook is not configured.' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  const rawBody = await req.text()

  let event
  try {
    event = client.webhooks.constructEvent(rawBody, signature, secret)
  } catch (err) {
    return Response.json({ error: `Invalid signature: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'account.updated') {
    const acct = event.data.object
    const sellerId = await getSellerIdByAccountId(acct.id)
    if (sellerId) {
      await updateSeller(sellerId, {
        chargesEnabled: Boolean(acct.charges_enabled),
        payoutsEnabled: Boolean(acct.payouts_enabled),
        detailsSubmitted: Boolean(acct.details_submitted),
      })
    }
  }

  return Response.json({ received: true })
}
