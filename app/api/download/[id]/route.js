import { get } from '@vercel/blob'
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
    return Response.json({ error: 'Session does not match this product.' }, { status: 403 })
  }

  const listing = await getListing(id)
  const files = listingFiles(listing)
  if (!listing || !Number.isInteger(fileIndex) || !files[fileIndex]?.blobPathname) {
    return Response.json({ error: 'File is gone.' }, { status: 404 })
  }

  await recordPurchase(id, sessionId)
  const entitlement = await consumeDownload(sessionId, fileIndex, listing.downloadsPerFile)
  if (!entitlement.allowed) {
    return Response.json({ error: 'Download limit reached for this file.' }, { status: 410 })
  }

  const file = files[fileIndex]
  const result = await get(file.blobPathname, { access: 'public' })
  if (!result || result.statusCode !== 200) {
    return Response.json({ error: 'File is gone.' }, { status: 404 })
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
