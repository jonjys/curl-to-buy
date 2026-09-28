import { handleUpload } from '@vercel/blob/client'
import { MAX_MB } from '../../../lib/site'
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from '../../../lib/public-image'

export const runtime = 'nodejs'

const IMAGE_STAGING_PREFIX = 'uploads/image-staging/'

export async function POST(request) {
  const body = await request.json()
  try {
    const json = await handleUpload({
      body,
      request,
      // Every upload is private. Listing images go to a staging path, limited to
      // small images, and only the server can publish them after cleaning.
      onBeforeGenerateToken: async (pathname) => String(pathname || '').startsWith(IMAGE_STAGING_PREFIX)
        ? { maximumSizeInBytes: MAX_IMAGE_BYTES, allowedContentTypes: Object.keys(IMAGE_TYPES), addRandomSuffix: true, access: 'private' }
        : { maximumSizeInBytes: MAX_MB * 1024 * 1024, addRandomSuffix: true, access: 'private' },
      onUploadCompleted: async () => {},
    })
    return Response.json(json)
  } catch (error) {
    return Response.json({ error: error.message || 'Upload URL failed.' }, { status: 400 })
  }
}
