import { put } from '@vercel/blob'
import { saveListing } from '../../../lib/store'
import { newId } from '../../../lib/id'
import { parsePrice } from '../../../lib/price'
import { MAX_MB } from '../../../lib/site'
import { storageErrorMessage } from '../../../lib/blob-error'

export const runtime = 'nodejs'

export async function POST(req) {
  const form = await req.formData()
  const file = form.get('file')
  const price = parsePrice({
    priceUsd: form.get('priceUsd'),
    priceSek: form.get('priceSek'),
  })
  if (!file || typeof file === 'string') {
    return Response.json({ error: 'Choose a file first.' }, { status: 400 })
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return Response.json({ error: `File is too large (max ${MAX_MB} MB).` }, { status: 400 })
  }
  if (!price) {
    return Response.json({ error: 'Price must be at least $1.' }, { status: 400 })
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: 'Storage is not configured.' }, { status: 500 })
  }

  const id = newId()
  try {
    const blob = await put(`files/${id}/${file.name}`, file, {
      access: 'public',
      addRandomSuffix: false,
    })
    const listing = {
      id,
      name: file.name,
      blobPathname: blob.pathname,
      size: file.size,
      type: file.type || 'application/octet-stream',
      currency: price.currency,
      priceUsd: price.priceUsd,
      priceSek: price.priceSek,
      priceCents: price.priceCents,
      createdAt: Date.now(),
    }
    await saveListing(listing)
    return Response.json({
      id,
      name: listing.name,
      priceUsd: listing.priceUsd,
      priceSek: listing.priceSek,
      currency: listing.currency,
    })
  } catch (err) {
    return Response.json({ error: storageErrorMessage(err) }, { status: 500 })
  }
}
