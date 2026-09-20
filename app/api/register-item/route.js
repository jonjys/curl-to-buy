import { saveListing } from '../../../lib/store'
import { publishListing } from '../../../lib/publish-listing'
import { parsePrice } from '../../../lib/price'
import { billingState } from '../../../lib/billing'
import { isSubscribed, priceError, saleTerms } from '../../../lib/entitlement'
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
  if (!seller?.paymentAccountId) {
    return Response.json({ error: 'Connect Stripe before publishing an item.' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return Response.json({ error: 'Invalid item.' }, { status: 400 })

  const title = String(body.title || '').trim()
  const description = String(body.description || '').trim()
  const condition = String(body.condition || '')
  const locale = body.locale === 'sv' ? 'sv' : 'en'
  const terms = saleTerms(isSubscribed(await billingState(seller).catch(() => ({ active: false }))))
  const price = parsePrice({ priceSek: body.priceSek }, { minSek: terms.minSek })
  const photoUrl = allowedPhoto(body.photoUrl)
  if (title.length < 3 || title.length > 100 || description.length > 300 || !CONDITIONS.has(condition)) {
    return Response.json({ error: 'Enter a title, condition and description of at most 300 characters.' }, { status: 400 })
  }
  if (!price || price.currency !== 'sek') {
    return Response.json({ error: priceError(terms, locale, 'sek') }, { status: 400 })
  }
  if (body.photoUrl && !photoUrl) return Response.json({ error: 'Invalid item photo.' }, { status: 400 })
  if (body.shippingIncluded !== true) {
    return Response.json({ error: 'Confirm that shipping within Sweden is included in your price.' }, { status: 400 })
  }

  const stock = body.salesLimit === null ? null : Number(body.salesLimit ?? 1)
  if (stock !== null && (!Number.isSafeInteger(stock) || stock < 1 || stock > 100000)) return Response.json({ error: 'Enter a valid stock quantity.' }, { status: 400 })
  const countries = Array.isArray(body.shippingCountries) ? [...new Set(body.shippingCountries)] : ['SE']
  const allowed = new Set(['SE', 'DK', 'FI', 'NO', 'DE', 'FR', 'NL', 'BE', 'AT', 'IE', 'IT', 'ES', 'PT', 'PL'])
  if (!countries.length || countries.some((c) => !allowed.has(c))) return Response.json({ error: 'Choose delivery countries.' }, { status: 400 })
  let sourceUrl = null
  if (body.sourceUrl) {
    try {
      const url = new URL(String(body.sourceUrl))
      if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048) throw Error()
      sourceUrl = url.href
    } catch { return Response.json({ error: 'Enter a valid HTTPS product URL without credentials.' }, { status: 400 }) }
  }
  let listing = {
    kind: 'physical',
    sourceUrl,
    variant: String(body.variant || '').trim().slice(0, 120),
    name: title,
    description: description || null,
    condition,
    photoUrl,
    shippingIncluded: true,
    shippingCountries: countries,
    files: [],
    currency: price.currency,
    priceUsd: null,
    priceSek: price.priceSek,
    priceCents: price.priceCents,
    salesLimit: stock,
    brand: String(body.brand || '').trim().slice(0, 80),
    deliveryEstimate: String(body.deliveryEstimate || '').trim().slice(0, 160),
    returnPolicy: String(body.returnPolicy || '').trim().slice(0, 500),
    sellerContact: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.contactEmail || '')) && String(body.contactEmail).length <= 254 ? String(body.contactEmail) : null,
    downloadsPerFile: null,
    sellerId: seller.id,
    createdAt: Date.now(),
  }

  try {
    listing = await publishListing(seller, body, listing)
  } catch (error) {
    return Response.json({ error: error.status ? error.message : storageErrorMessage(error), needsPlan: Boolean(error.needsPlan), quotaExceeded: Boolean(error.quotaExceeded) }, { status: error.status || 500 })
  }
  return Response.json({ id: listing.id, name: listing.name, kind: 'physical', priceSek: listing.priceSek, currency: 'sek', salesLimit: listing.salesLimit })
}

