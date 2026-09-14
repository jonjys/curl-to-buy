import { handleUpload } from '@vercel/blob/client'
import { MAX_MB } from '../../../lib/site'

export const runtime = 'nodejs'

// Deliberately no seller-readiness check here: a file may be uploaded to
// Blob storage before the seller has finished Stripe Connect (its bytes
// are saved as part of the deferred-publish draft — see upload-form.jsx).
// The actual gate that matters — turning an upload into a public, sellable
// listing — is enforced separately by /api/register and /api/upload.
export async function POST(request) {
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
