import { stripe } from '../../../lib/stripe'
import { getListing, listingFiles, recordPurchase } from '../../../lib/store'

export const runtime = 'nodejs'

export async function GET(req) {
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')
  let listingId = url.searchParams.get('listing_id')
  if (!sessionId) return Response.json({ error: 'Payment reference is incomplete.' }, { status: 400 })

  const client = stripe()
  if (!client) return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })

  try {
    const session = await client.checkout.sessions.retrieve(sessionId)
    listingId = listingId || session.metadata?.file_id || ''
    if (!listingId) return Response.json({ error: 'Payment reference is incomplete.' }, { status: 400 })

    const listing = await getListing(listingId)
    if (!listing) return Response.json({ error: 'The files are no longer available.' }, { status: 404 })
    if (session.payment_status !== 'paid' || session.metadata?.file_id !== listingId) {
      return Response.json({ status: session.payment_status, file_id: listingId })
    }
    await recordPurchase(listingId, sessionId)

    return Response.json({
      status: 'paid',
      customer_email: session.customer_details?.email || session.customer_email || null,
      file_id: listingId,
      title: listing.name,
      files: listingFiles(listing).map((file, index) => ({ index, name: file.name })),
      downloadsPerFile: Number.isInteger(listing.downloadsPerFile) ? listing.downloadsPerFile : null,
    })
  } catch {
    return Response.json({ error: 'Could not verify the payment.' }, { status: 400 })
  }
}
