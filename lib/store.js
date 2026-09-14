import { get, list, put } from '@vercel/blob'

const listingPrefix = 'listings/'
const purchasePrefix = 'purchases/'
const entitlementPrefix = 'entitlements/'
const sellerPrefix = 'sellers/'

function safe(value) {
  return typeof value === 'string' && value.length <= 240 && !/[^a-zA-Z0-9_-]/.test(value)
}

async function readJson(pathname) {
  try {
    const result = await get(pathname, { access: 'public' })
    if (!result || result.statusCode !== 200) return null
    return JSON.parse(await new Response(result.stream).text())
  } catch {
    return null
  }
}

async function writeJson(pathname, value) {
  await put(pathname, JSON.stringify(value), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

export async function saveListing(listing) {
  await writeJson(`${listingPrefix}${listing.id}.json`, listing)
  return listing
}

export async function getListing(id) {
  if (!safe(id)) return null
  return readJson(`${listingPrefix}${id}.json`)
}

export async function saveSeller(seller) {
  await writeJson(`${sellerPrefix}${seller.id}.json`, seller)
  return seller
}

export async function getSeller(id) {
  if (!safe(id)) return null
  return readJson(`${sellerPrefix}${id}.json`)
}

export async function updateSeller(id, changes) {
  const seller = await getSeller(id)
  if (!seller) return null
  return saveSeller({ ...seller, ...changes, updatedAt: Date.now() })
}

export function listingFiles(listing) {
  if (Array.isArray(listing?.files) && listing.files.length) return listing.files
  if (!listing?.blobPathname) return []
  return [{
    name: listing.name,
    blobPathname: listing.blobPathname,
    size: listing.size || 0,
    type: listing.type || 'application/octet-stream',
  }]
}

export async function recordPurchase(listingId, sessionId) {
  if (!safe(listingId) || !safe(sessionId)) return
  await writeJson(`${purchasePrefix}${listingId}/${sessionId}.json`, {
    listingId,
    sessionId,
    paidAt: Date.now(),
  })
}

export async function getSalesCount(listingId) {
  if (!safe(listingId)) return 0
  const result = await list({ prefix: `${purchasePrefix}${listingId}/`, limit: 1000 })
  return result.blobs.length
}

export async function consumeDownload(sessionId, fileIndex, limit) {
  if (!safe(sessionId) || !Number.isInteger(fileIndex) || fileIndex < 0) return { allowed: false, remaining: 0 }
  if (!Number.isInteger(limit) || limit < 1) return { allowed: true, remaining: null }

  const pathname = `${entitlementPrefix}${sessionId}/${fileIndex}.json`
  const current = await readJson(pathname)
  const count = Number(current?.count) || 0
  if (count >= limit) return { allowed: false, remaining: 0 }

  const next = count + 1
  await writeJson(pathname, { count: next, updatedAt: Date.now() })
  return { allowed: true, remaining: Math.max(0, limit - next) }
}
