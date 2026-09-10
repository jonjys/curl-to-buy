import { handleUpload } from '@vercel/blob/client'
import { MAX_MB } from '../../../lib/site'

export const runtime = 'nodejs'

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
