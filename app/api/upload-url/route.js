import { handleUpload } from '@vercel/blob/client'
import { MAX_MB } from '../../../lib/site'
import { getSeller } from '../../../lib/store'
import { sellerIdFromRequest } from '../../../lib/seller'

export const runtime = 'nodejs'

export async function POST(request) {
  const sellerId = sellerIdFromRequest(request)
  const seller = sellerId ? await getSeller(sellerId) : null
  if (!seller?.stripeAccountId || !seller.ready) {
    return Response.json({ error: 'Connect Stripe before uploading.' }, { status: 403 })
  }
  const body = await request.json()
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        maximumSizeInBytes: MAX_MB * 1024 * 1024,
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    })
    return Response.json(json)
  } catch (error) {
    return Response.json({ error: error.message || 'Upload URL failed.' }, { status: 400 })
  }
}
