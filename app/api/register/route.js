import { saveListing } from '../../../lib/store'
import { publishListing } from '../../../lib/publish-listing'
import { parsePrice } from '../../../lib/price'
import { MAX_DESCRIPTION_LENGTH, MAX_FILES, MAX_MB, MAX_SALES_LIMIT, TIME_LIMIT_MINUTES } from '../../../lib/site'
import { storageErrorMessage } from '../../../lib/blob-error'
import { loadReadySeller } from '../../../lib/stripe-connect'

export const runtime = 'nodejs'

const DOWNLOAD_LIMITS = new Set([1, 3, 5, 10])
const TIME_LIMITS = new Set(TIME_LIMIT_MINUTES)

function numberOrNull(value, allowed) {
  if (value === null || value === 'unlimited') return null
  const number = Number(value)
  return allowed.has(number) ? number : null
}

function salesLimitOrNull(value) {
  if (value === null || value === undefined || value === 'unlimited' || value === '') return null
  const number = Math.floor(Number(value))
  return Number.isInteger(number) && number >= 1 && number <= MAX_SALES_LIMIT ? number : null
}

function expiresAtOrNull(timeLimitMinutes) {
  if (timeLimitMinutes === null || timeLimitMinutes === undefined || timeLimitMinutes === 'none') return null
  const number = Number(timeLimitMinutes)
  return TIME_LIMITS.has(number) ? Date.now() + number * 60 * 1000 : null
}

function descriptionOrNull(value) {
  const text = String(value || '').trim().slice(0, MAX_DESCRIPTION_LENGTH)
  return text || null
}

export async function POST(req) {
  const seller = await loadReadySeller(req)
  if (!seller?.paymentAccountId && !seller?.stripeAccountId) {
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

  let listing = {
    name: String(body.title || (files.length === 1 ? files[0].name : `${files.length}-file package`)).slice(0, 100),
    files,
    size: files.reduce((sum, file) => sum + file.size, 0),
    currency: price.currency,
    priceUsd: price.priceUsd,
    priceSek: price.priceSek,
    priceCents: price.priceCents,
    salesLimit: salesLimitOrNull(body.salesLimit),
    downloadsPerFile: numberOrNull(body.downloadsPerFile, DOWNLOAD_LIMITS),
    description: descriptionOrNull(body.description),
    expiresAt: expiresAtOrNull(body.timeLimitMinutes),
    sellerId: seller.id,
    createdAt: Date.now(),
  }

  try {
    listing = await publishListing(seller, body, listing)
  } catch (err) {
    return Response.json({ error: err.status ? err.message : storageErrorMessage(err), needsPlan: Boolean(err.needsPlan), quotaExceeded: Boolean(err.quotaExceeded) }, { status: err.status || 500 })
  }

  return Response.json({
    id: listing.id,
    name: listing.name,
    fileCount: files.length,
    priceUsd: listing.priceUsd,
    priceSek: listing.priceSek,
    currency: listing.currency,
    salesLimit: listing.salesLimit,
    downloadsPerFile: listing.downloadsPerFile,
    expiresAt: listing.expiresAt,
  })
}

