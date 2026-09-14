import { put } from '@vercel/blob'
import { saveListing, getSeller, updateSeller } from '../../../lib/store'
import { newId } from '../../../lib/id'
import { parsePrice } from '../../../lib/price'
import { MAX_MB } from '../../../lib/site'
import { storageErrorMessage } from '../../../lib/blob-error'
import { currentSellerFromRequest } from '../../../lib/seller'

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
    // If this browser already has a seller cookie (from a previous listing),
    // reuse that same seller/Stripe account instead of leaving this listing
    // unlinked until a separate "Connect payouts" click.
    const seller = await currentSellerFromRequest(req, { getSeller })
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
      sellerId: seller?.id || null,
      createdAt: Date.now(),
    }
    await saveListing(listing)
    if (seller && !seller.listingIds.includes(id)) {
      await updateSeller(seller.id, { listingIds: [...seller.listingIds, id] })
    }
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
