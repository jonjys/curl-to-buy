import { stripe } from '../../../../lib/stripe'

export const runtime = 'nodejs'

// Correctly refund a Connect destination-charge sale: reverse BOTH the
// transfer to the seller AND the platform's application fee together.
//
// This exists because the naive fix — refunding from the Stripe Dashboard on
// the platform's own Payments list — does NOT automatically reverse the
// transfer or the fee unless you explicitly check those boxes. Get it wrong
// and the seller keeps their 95% while the platform eats the whole refund.
//
// Requires an ADMIN_SECRET environment variable (a shared bearer secret you
// set yourself in Vercel — see PR notes for a freshly generated value).
export async function POST(req) {
  const client = stripe()
  if (!client) {
    return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })
  }
  const configured = process.env.ADMIN_SECRET
  const auth = req.headers.get('authorization') || ''
  if (!configured || auth !== `Bearer ${configured}`) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null
  const paymentIntentId = typeof body.paymentIntentId === 'string' ? body.paymentIntentId : null
  if (!sessionId && !paymentIntentId) {
    return Response.json({ error: 'Provide sessionId or paymentIntentId.' }, { status: 400 })
  }

  try {
    let piId = paymentIntentId
    if (!piId) {
      const session = await client.checkout.sessions.retrieve(sessionId)
      piId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
    }
    if (!piId) {
      return Response.json({ error: 'No payment found for that session.' }, { status: 404 })
    }
    const refund = await client.refunds.create({
      payment_intent: piId,
      reverse_transfer: true,
      refund_application_fee: true,
    })
    return Response.json({ refunded: true, refundId: refund.id, status: refund.status })
  } catch (err) {
    return Response.json({ error: err?.message || 'Refund failed.' }, { status: 500 })
  }
}
