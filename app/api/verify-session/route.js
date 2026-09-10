import { stripe } from '../../../lib/stripe'

export const runtime = 'nodejs'

export async function GET(req) {
  const sessionId = new URL(req.url).searchParams.get('session_id')
  if (!sessionId) {
    return Response.json({ error: 'No session ID in the URL.' }, { status: 400 })
  }
  const client = stripe()
  if (!client) {
    return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })
  }
  try {
    const session = await client.checkout.sessions.retrieve(sessionId)
    return Response.json({
      status: session.payment_status,
      customer_email: session.customer_details?.email || session.customer_email || null,
      file_id: session.metadata?.file_id || null,
    })
  } catch {
    return Response.json({ error: 'Could not verify the payment.' }, { status: 400 })
  }
}
