import { get } from '@vercel/blob'
import { retrieveCheckout, paymentCanFulfill } from '../../../../lib/payment-context'
import { stripe } from '../../../../lib/stripe'
import { consumeDownload, getListing, listingFiles, recordPurchase } from '../../../../lib/store'

export const runtime = 'nodejs'

export async function GET(req, { params }) {
  const { id } = await params
  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')
  const fileIndex = Number(url.searchParams.get('file') || 0)
  if (!sessionId) return Response.json({ error: 'Missing session.' }, { status: 400 })

  const client = stripe()
  if (!client) return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })

  const listing = await getListing(id)
  let session
  try {
    session = await retrieveCheckout(client, sessionId, id, listing?.paymentAccountId)
  } catch {
    return Response.json({ error: 'Could not verify the payment.' }, { status: 400 })
  }
  if (!paymentCanFulfill(session)) {
    return Response.json({ error: 'Payment has not been completed.' }, { status: 402 })
  }
  if (session.metadata?.file_id !== id) {
    return Response.json({ error: 'Session does not match this product.' }, { status: 403 })
  }

  const files = listingFiles(listing)
  if (!listing || !Number.isInteger(fileIndex) || !files[fileIndex]?.blobPathname) {
    return Response.json({ error: 'File is gone.' }, { status: 404 })
  }

  const file = files[fileIndex]
  let result = null
  for (const access of ['private', 'public']) {
    try {
      const found = await get(file.blobPathname, { access })
      if (found?.statusCode === 200 && found.stream) { result = found; break }
    } catch { /* Older uploads are public. */ }
  }
  if (!result) {
    return Response.json({ error: 'File is gone.' }, { status: 404 })
  }

  try {
    await recordPurchase(id, sessionId)
  } catch (error) {
    console.error('Purchase ledger write failed', { listingId: id, message: error instanceof Error ? error.message : 'Unknown error' })
  }
  let entitlement
  try {
    entitlement = await consumeDownload(sessionId, fileIndex, listing.downloadsPerFile)
  } catch (error) {
    console.error('Download allowance unavailable', { message: error instanceof Error ? error.message : 'Unknown error' })
    entitlement = { allowed: true, remaining: null }
  }
  if (!entitlement.allowed) {
    return Response.json({ error: 'Download limit reached for this file.' }, { status: 410 })
  }

  const filename = file.name.replace(/[\r\n\"]/g, '_')
  return new Response(result.stream, {
    headers: {
      'Content-Type': file.type || result.blob.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
      ...(entitlement.remaining == null ? {} : { 'X-Downloads-Remaining': String(entitlement.remaining) }),
    },
  })
}
