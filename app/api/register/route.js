import { saveListing } from '../../../lib/store'
import { newId } from '../../../lib/id'
import { parsePrice } from '../../../lib/price'
import { storageErrorMessage } from '../../../lib/blob-error'

export const runtime = 'nodejs'

export async function POST(req) {
  const body = await req.json().catch(() => null)
  if (!body?.blobPathname || !body?.name) {
    return Response.json({ error: 'Missing file.' }, { status: 400 })
  }
  const price = parsePrice(body)
  if (!price) {
    return Response.json({ error: 'Price must be at least $1.' }, { status: 400 })
  }
  const id = newId()
  const listing = {
    id,
    name: String(body.name).slice(0, 240),
    blobPathname: String(body.blobPathname),
    size: Number(body.size) || 0,
    type: body.type || 'application/octet-stream',
    currency: price.currency,
    priceUsd: price.priceUsd,
    priceSek: price.priceSek,
    priceCents: price.priceCents,
    createdAt: Date.now(),
  }
  try {
    await saveListing(listing)
  } catch (err) {
    return Response.json({ error: storageErrorMessage(err) }, { status: 500 })
  }
  return Response.json({
    id,
    name: listing.name,
    priceUsd: listing.priceUsd,
    priceSek: listing.priceSek,
    currency: listing.currency,
  })
}
