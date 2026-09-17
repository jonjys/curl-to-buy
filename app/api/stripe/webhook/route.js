import { stripe } from '../../../../lib/stripe'
import { getListing, recordPurchase } from '../../../../lib/store'

export const runtime = 'nodejs'

// Stripe's live "buy-to-curl" endpoint points to this exact route.
// Use its own signing secret; other Stripe endpoints have different secrets.
export async function POST(req) {
  const client = stripe()
  const secret = process.env.STRIPE_CTB_WEBHOOK_SECRET
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

  if (event.type !== 'checkout.session.completed' &&
      event.type !== 'checkout.session.async_payment_succeeded') {
    return Response.json({ received: true })
  }

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
