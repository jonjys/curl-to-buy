import { saveListing } from '../../../lib/store'
import { newId } from '../../../lib/id'
import { parsePrice } from '../../../lib/price'
import { loadReadySeller } from '../../../lib/stripe-connect'
import { storageErrorMessage } from '../../../lib/blob-error'

export const runtime = 'nodejs'

const CONDITIONS = new Set(['new', 'used_good', 'used_fair'])

function allowedPhoto(url) {
  if (!url) return null
  try {
    const value = new URL(url)
    if (value.protocol !== 'https:' || !value.hostname.endsWith('.public.blob.vercel-storage.com')) return null
    if (!value.pathname.startsWith('/uploads/items/')) return null
    return value.href
  } catch { return null }
}

export async function POST(req) {
  const seller = await loadReadySeller(req)
  if (!seller?.stripeAccountId) {
    return Response.json({ error: 'Connect Stripe before publishing an item.' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return Response.json({ error: 'Invalid item.' }, { status: 400 })

  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  const condition = String(body.condition || '')
  const price = parsePrice({ priceSek: body.priceSek })
  const photoUrl = allowedPhoto(body.photoUrl)
  if (title.length < 3 || title.length > 100 || description.length > 300 || !CONDITIONS.has(condition)) {
    return Response.json({ error: 'Enter a title, condition and description of at most 300 characters.' }, { status: 400 })
  }
  if (!price || price.currency !== 'sek') {
    return Response.json({ error: 'Item price must be at least 50 SEK.' }, { status: 400 })
  }
  if (body.photoUrl && !photoUrl) return Response.json({ error: 'Invalid item photo.' }, { status: 400 })
  if (body.shippingIncluded !== true) {
    return Response.json({ error: 'Confirm that shipping within Sweden is included in your price.' }, { status: 400 })
  }

  const id = newId()
  const listing = {
    id,
    kind: 'physical',
    name: title,
    description: description || null,
    condition,
    photoUrl,
    shippingIncluded: true,
    shippingCountries: ['SE'],
    files: [],
    currency: price.currency,
    priceUsd: null,
    priceSek: price.priceSek,
    priceCents: price.priceCents,
    salesLimit: 1,
    downloadsPerFile: null,
    sellerId: seller.id,
    createdAt: Date.now(),
  }

  try {
    await saveListing(listing)
  } catch (error) {
    return Response.json({ error: storageErrorMessage(error) }, { status: 500 })
  }
  return Response.json({ id, name: listing.name, kind: 'physical', priceSek: listing.priceSek, currency: 'sek', salesLimit: 1 })
}
