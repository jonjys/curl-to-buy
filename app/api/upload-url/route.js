import { handleUpload } from '@vercel/blob/client'
import { MAX_MB } from '../../../lib/site'

export const runtime = 'nodejs'

export async function POST(request) {
  const body = await request.json()
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => ({
        maximumSizeInBytes: MAX_MB * 1024 * 1024,
        addRandomSuffix: true,
        access: String(pathname || '').startsWith('uploads/items/') ? 'public' : 'private',
      }),
      onUploadCompleted: async () => {},
    })
    return Response.json(json)
  } catch (error) {
    return Response.json({ error: error.message || 'Upload URL failed.' }, { status: 400 })
  }
}
