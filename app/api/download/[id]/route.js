import { stripe } from '../../../../../lib/stripe'
import { getListing } from '../../../../../lib/store'

export const runtime = 'nodejs'

export async function GET(req, { params }) {
  const { id } = await params
  const sessionId = new URL(req.url).searchParams.get('session_id')
  if (!sessionId) {
    return Response.json({ error: 'Missing session.' }, { status: 400 })
  }
  const client = stripe()
  if (!client) {
    return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })
  }
  let session
  try {
    session = await client.checkout.sessions.retrieve(sessionId)
  } catch {
    return Response.json({ error: 'Could not verify the payment.' }, { status: 400 })
  }
  if (session.payment_status !== 'paid') {
    return Response.json({ error: 'Payment has not been completed.' }, { status: 402 })
  }
  if (session.metadata?.file_id !== id) {
    return Response.json({ error: 'Session does not match this file.' }, { status: 403 })
  }
  const listing = await getListing(id)
  if (!listing?.blobUrl) {
    return Response.json({ error: 'File is gone.' }, { status: 404 })
  }
  const fileRes = await fetch(listing.blobUrl)
  if (!fileRes.ok) {
    return Response.json({ error: 'File is gone.' }, { status: 404 })
  }
  const buf = await fileRes.arrayBuffer()
  const filename = listing.name.replace(/[\r\n"]/g, '_')
  return new Response(buf, {
    headers: {
      'Content-Type': listing.type || fileRes.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
