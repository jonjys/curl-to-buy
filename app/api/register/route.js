import { getSeller, saveListing } from '../../../lib/store'
import { newId } from '../../../lib/id'
import { parsePrice } from '../../../lib/price'
import { MAX_FILES, MAX_MB } from '../../../lib/site'
import { storageErrorMessage } from '../../../lib/blob-error'
import { sellerIdFromRequest } from '../../../lib/seller'

export const runtime = 'nodejs'

const LIMITS = new Set([1, 5, 25, 100])
const DOWNLOAD_LIMITS = new Set([1, 3, 5, 10])

function numberOrNull(value, allowed) {
  if (value === null || value === 'unlimited') return null
  const number = Number(value)
  return allowed.has(number) ? number : null
}

export async function POST(req) {
  const sellerId = sellerIdFromRequest(req)
  const seller = sellerId ? await getSeller(sellerId) : null
  if (!seller?.stripeAccountId || !seller.ready) {
    return Response.json({ error: 'Connect Stripe before creating a selling link.' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const incoming = Array.isArray(body?.files)
    ? body.files
    : body?.blobPathname && body?.name
      ? [body]
      : []

  if (!incoming.length || incoming.length > MAX_FILES) {
    return Response.json({ error: `Choose 1–${MAX_FILES} files.` }, { status: 400 })
  }

  const files = incoming.map((file) => ({
    name: String(file.name || '').slice(0, 240),
    blobPathname: String(file.blobPathname || ''),
    size: Math.max(0, Number(file.size) || 0),
    type: String(file.type || 'application/octet-stream').slice(0, 120),
  }))
  if (files.some((file) => !file.name || !file.blobPathname.startsWith('uploads/'))) {
    return Response.json({ error: 'Invalid upload.' }, { status: 400 })
  }
  if (files.reduce((sum, file) => sum + file.size, 0) > MAX_MB * 1024 * 1024) {
    return Response.json({ error: `Package is too large (max ${MAX_MB} MB).` }, { status: 400 })
  }

  const price = parsePrice(body)
  if (!price) return Response.json({ error: 'Price must be at least $5.' }, { status: 400 })

  const id = newId()
  const listing = {
    id,
    name: String(body.title || (files.length === 1 ? files[0].name : `${files.length}-file package`)).slice(0, 100),
    files,
    size: files.reduce((sum, file) => sum + file.size, 0),
    currency: price.currency,
    priceUsd: price.priceUsd,
    priceSek: price.priceSek,
    priceCents: price.priceCents,
    salesLimit: numberOrNull(body.salesLimit, LIMITS),
    downloadsPerFile: numberOrNull(body.downloadsPerFile, DOWNLOAD_LIMITS),
    sellerId: seller.id,
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
    fileCount: files.length,
    priceUsd: listing.priceUsd,
    priceSek: listing.priceSek,
    currency: listing.currency,
    salesLimit: listing.salesLimit,
    downloadsPerFile: listing.downloadsPerFile,
  })
}
