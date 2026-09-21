import { reconcileBillingEvent } from '../../../../lib/billing-events'
import { checkoutContext, paymentCanFulfill, retrieveCheckout } from '../../../../lib/payment-context'
import { stripe } from '../../../../lib/stripe'
import { getListing, recordPurchase } from '../../../../lib/store'

export const runtime = 'nodejs'

// Stripe's live "buy-to-curl" endpoint points to this exact route.
// Use its own signing secret; other Stripe endpoints have different secrets.
export async function handleWebhook(req, connected = false) {
  const client = stripe()
  const secret = connected ? process.env.STRIPE_CTB_CONNECT_WEBHOOK_SECRET : process.env.STRIPE_CTB_WEBHOOK_SECRET
  if (!client || !secret) {
    console.error('Stripe Checkout webhook is missing its server-side configuration.')
    // Retriable: never acknowledge a payment event we cannot verify.
    return Response.json({ error: 'Webhook unavailable.' }, { status: 503 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return Response.json({ error: 'Missing Stripe signature.' }, { status: 400 })
  }

  let event
  try {
    // req.text() preserves the raw request body needed for signature verification.
    event = client.webhooks.constructEvent(await req.text(), signature, secret)
  } catch {
    return Response.json({ error: 'Invalid Stripe signature.' }, { status: 400 })
  }

  if (!connected) {
    try {
      if (await reconcileBillingEvent(client, event)) return Response.json({ received: true })
    } catch {
      return Response.json({ error: 'Subscription reconciliation pending.' }, { status: 503 })
    }
  }

  if (event.type !== 'checkout.session.completed' &&
      event.type !== 'checkout.session.async_payment_succeeded') {
    return Response.json({ received: true })
  }

  if (Boolean(event.account) !== connected) return Response.json({ error: 'Wrong event scope.' }, { status: 400 })
  const session = event.data.object
  const listingId = session.metadata?.file_id
  // This Stripe account also hosts unrelated products; never register their sales here.
  if (!listingId) return Response.json({ received: true })

  if (session.mode !== 'payment' || session.payment_status !== 'paid') {
    // For delayed payment methods, the async success event will register the sale.
    return Response.json({ received: true })
  }

  try {
    const listing = await getListing(listingId)
    if (!listing) {
      console.error('Paid Checkout session references an unavailable Curl-to-Buy listing.', {
        eventId: event.id,
        listingId,
      })
      return Response.json({ error: 'Listing unavailable.' }, { status: 503 })
    }

    if (connected) {
      const context = await checkoutContext(session.id)
      if (!context) return Response.json({ error: 'Payment reference pending.' }, { status: 503 })
      if (context.accountId !== event.account || context.sellerId !== listing.sellerId || context.listingId !== listingId
        || session.metadata?.seller_id !== listing.sellerId || session.amount_total !== context.amount || session.currency !== context.currency) {
        return Response.json({ error: 'Payment owner mismatch.' }, { status: 400 })
      }
    }
    if (!paymentCanFulfill(await retrieveCheckout(client, session.id, listingId))) return Response.json({ received: true })
    // Uses the same listingId/sessionId key as /api/verify-session, so webhook
    // retries and a buyer visiting the success page cannot count twice.
    await recordPurchase(listingId, session.id)
    return Response.json({ received: true })
  } catch (error) {
    console.error('Stripe Checkout purchase registration failed.', {
      eventId: event.id,
      message: error instanceof Error ? error.message : 'Unknown error',
    })
    return Response.json({ error: 'Purchase registration failed.' }, { status: 500 })
  }
}


export async function POST(req) { return handleWebhook(req, false) }
