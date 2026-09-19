import { list } from '@vercel/blob'
import { stripe } from '../../../../lib/stripe'
import { getListing } from '../../../../lib/store'
import { sellerIdFromRequest } from '../../../../lib/seller'

export const runtime = 'nodejs'

export async function GET(req, { params }) {
  const { id } = await params
  const sellerId = sellerIdFromRequest(req)
  if (!sellerId) return Response.json({ error: 'Seller sign-in required. Recover your seller account by email if you changed device.' }, { status: 401 })
  const listing = await getListing(id)
  if (!listing || listing.kind !== 'physical' || listing.sellerId !== sellerId) {
    return Response.json({ error: 'Item not found for this seller.' }, { status: 404 })
  }
  const client = stripe()
  if (!client) return Response.json({ error: 'Stripe is not configured.' }, { status: 503 })

  try {
    const prefix = `purchases/${id}/`
    const page = await list({ prefix, limit: 100 })
    const sessionIds = page.blobs.map((blob) => blob.pathname.startsWith(prefix) ? blob.pathname.slice(prefix.length).replace(/\.json$/, '') : '')
      .filter((sessionId) => /^cs_(test_)?[a-zA-Z0-9_]+$/.test(sessionId))
    const orders = (await Promise.all(sessionIds.map(async (sessionId) => {
      const session = await client.checkout.sessions.retrieve(sessionId)
      if (session.payment_status !== 'paid' || session.metadata?.file_id !== id) return null
      const shipping = session.collected_information?.shipping_details || session.shipping_details || null
      return {
        reference: session.id,
        created: session.created,
        amount: session.amount_total,
        currency: session.currency,
        buyerEmail: session.customer_details?.email || session.customer_email || null,
        buyerName: shipping?.name || session.customer_details?.name || null,
        buyerPhone: shipping?.phone || session.customer_details?.phone || null,
        shippingAddress: shipping?.address || null,
      }
    }))).filter(Boolean).sort((a, b) => b.created - a.created)
    return Response.json({ name: listing.name, orders, hasMore: page.hasMore }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return Response.json({ error: 'Could not load paid orders. Try again.' }, { status: 503 })
  }
}
