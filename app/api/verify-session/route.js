import { stripe } from '../../../lib/stripe'
import { getListing, getSeller, listingFiles, recordPurchase } from '../../../lib/store'

export const runtime = 'nodejs'

export async function GET(req) {
  const sessionId = new URL(req.url).searchParams.get('session_id')
  const listingId = new URL(req.url).searchParams.get('listing_id')
  if (!sessionId || !listingId) return Response.json({ error: 'Payment reference is incomplete.' }, { status: 400 })

  const client = stripe()
  if (!client) return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })

  try {
    const listing = await getListing(listingId)
    const seller = listing?.sellerId ? await getSeller(listing.sellerId) : null
    if (!listing || !seller?.stripeAccountId) return Response.json({ error: 'The files are no longer available.' }, { status: 404 })
    const session = await client.checkout.sessions.retrieve(sessionId, {}, { stripeAccount: seller.stripeAccountId })
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
