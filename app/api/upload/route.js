import { put } from '@vercel/blob'
import { saveListing } from '../../../lib/store'
import { listingIdFor } from '../../../lib/commerce-store'
import { publishListing } from '../../../lib/publish-listing'
import { parsePrice } from '../../../lib/price'
import { billingState } from '../../../lib/billing'
import { isSubscribed, priceError, saleTerms } from '../../../lib/entitlement'
import { MAX_DESCRIPTION_LENGTH, MAX_MB, MAX_SALES_LIMIT, TIME_LIMIT_MINUTES } from '../../../lib/site'
import { storageErrorMessage } from '../../../lib/blob-error'
import { loadReadySeller } from '../../../lib/stripe-connect'

export const runtime = 'nodejs'

function limit(value, allowed) {
  if (value === 'unlimited') return null
  const parsed = Number(value)
  return allowed.includes(parsed) ? parsed : null
}

function salesLimitOrNull(value) {
  if (value === null || value === undefined || value === 'unlimited' || value === '') return null
  const number = Math.floor(Number(value))
  return Number.isInteger(number) && number >= 1 && number <= MAX_SALES_LIMIT ? number : null
}

function expiresAtOrNull(timeLimitMinutes) {
  if (timeLimitMinutes === null || timeLimitMinutes === undefined || timeLimitMinutes === 'none') return null
  const number = Number(timeLimitMinutes)
  return TIME_LIMIT_MINUTES.includes(number) ? Date.now() + number * 60 * 1000 : null
}

function descriptionOrNull(value) {
  const text = String(value || '').trim().slice(0, MAX_DESCRIPTION_LENGTH)
  return text || null
}

export async function POST(req) {
  const seller = await loadReadySeller(req)
  if (!seller?.paymentAccountId) {
    return Response.json({ error: 'Connect Stripe before creating a selling link.' }, { status: 403 })
  }
  const form = await req.formData()
  const file = form.get('file')
  const locale = form.get('locale') === 'sv' ? 'sv' : 'en'
  const terms = saleTerms(isSubscribed(await billingState(seller).catch(() => ({ active: false }))))
  const price = parsePrice({ priceUsd: form.get('priceUsd'), priceSek: form.get('priceSek') }, { minUsd: terms.minUsd, minSek: terms.minSek })
  if (!file || typeof file === 'string') return Response.json({ error: 'Choose a file first.' }, { status: 400 })
  if (file.size > MAX_MB * 1024 * 1024) return Response.json({ error: `File is too large (max ${MAX_MB} MB).` }, { status: 400 })
  if (!price) return Response.json({ error: priceError(terms, locale, form.get('priceSek') && !form.get('priceUsd') ? 'sek' : 'usd') }, { status: 400 })
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: 'Storage is not configured.' }, { status: 500 })

  const body = { requestId: form.get('requestId'), accepted: form.get('accepted') === 'true' }
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(body.requestId || '')) return Response.json({ error: 'Refresh the form and retry.' }, { status: 400 })
  const id = listingIdFor(seller.id, body.requestId)
  try {
    const blob = await put(`files/${id}/${file.name}`, file, { access: 'public', addRandomSuffix: false })
    let listing = {
      id,
      name: String(form.get('title') || file.name).slice(0, 100),
      files: [{ name: file.name, blobPathname: blob.pathname, size: file.size, type: file.type || 'application/octet-stream' }],
      size: file.size,
      currency: price.currency,
      priceUsd: price.priceUsd,
      priceSek: price.priceSek,
      priceCents: price.priceCents,
      salesLimit: salesLimitOrNull(form.get('salesLimit')),
      downloadsPerFile: limit(form.get('downloadsPerFile'), [1, 3, 5, 10]),
      description: descriptionOrNull(form.get('description')),
      expiresAt: expiresAtOrNull(form.get('timeLimitMinutes')),
      sellerId: seller.id,
      createdAt: Date.now(),
    }
    listing = await publishListing(seller, body, listing)
    return Response.json({
      id,
      name: listing.name,
      fileCount: 1,
      priceUsd: listing.priceUsd,
      priceSek: listing.priceSek,
      currency: listing.currency,
      salesLimit: listing.salesLimit,
      downloadsPerFile: listing.downloadsPerFile,
      expiresAt: listing.expiresAt,
    })
  } catch (err) {
    return Response.json({ error: err.status ? err.message : storageErrorMessage(err), needsPlan: Boolean(err.needsPlan) }, { status: err.status || 500 })
  }
}

