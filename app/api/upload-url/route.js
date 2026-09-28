import { handleUpload } from '@vercel/blob/client'
import { MAX_MB } from '../../../lib/site'
import { IMAGE_TYPES, MAX_IMAGE_BYTES, isPublicImagePath } from '../../../lib/public-image'

export const runtime = 'nodejs'

export async function POST(request) {
  const body = await request.json()
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => isPublicImagePath(pathname)
        // Public paths only ever hold listing images, never sellable files.
        ? { maximumSizeInBytes: MAX_IMAGE_BYTES, allowedContentTypes: Object.keys(IMAGE_TYPES), addRandomSuffix: true, access: 'public' }
        : { maximumSizeInBytes: MAX_MB * 1024 * 1024, addRandomSuffix: true, access: 'private' },
      onUploadCompleted: async () => {},
    })
    return Response.json(json)
  } catch (error) {
    return Response.json({ error: error.message || 'Upload URL failed.' }, { status: 400 })
  }
}
