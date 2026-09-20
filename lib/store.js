import { get, list, put } from '@vercel/blob'

const listingPrefix = 'listings/'
const purchasePrefix = 'purchases/'
const entitlementPrefix = 'entitlements/'
const sellerPrefix = 'sellers/'
const sellerEmailPrefix = 'seller-emails/'
const verifyCodePrefix = 'verify-codes/'

function safe(value) {
  return typeof value === 'string' && value.length <= 240 && !/[^a-zA-Z0-9_-]/.test(value)
}

async function readJson(pathname) {
  try {
    const result = await get(pathname, { access: 'public', useCache: false })
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
  if (!safe(id)) return null
  const pathname = `${sellerPrefix}${id}.json`
  for (let attempt = 0; attempt < 8; attempt++) {
    const result = await get(pathname, { access: 'public', useCache: false })
    if (!result || result.statusCode !== 200) return null
    const seller = JSON.parse(await new Response(result.stream).text())
    const next = { ...seller, ...changes, updatedAt: Date.now() }
    try {
      await put(pathname, JSON.stringify(next), { access: 'public', addRandomSuffix: false, ifMatch: result.blob.etag, contentType: 'application/json' })
      return next
    } catch (error) {
      if (!/precondition/i.test(`${error.name} ${error.message}`)) throw error
    }
  }
  throw new Error('Seller update is busy. Please retry.')
}

// emailHash keys, never the address, keep a leaked blob listing anonymous.
export async function saveSellerEmailIndex(emailHash, sellerId) {
  if (!safe(emailHash)) return
  const path = `${sellerEmailPrefix}${emailHash}.json`
  const current = await readJson(path)
  if (current?.sellerId === sellerId) return
  if (current) throw new Error('Verify your existing seller email to continue.')
  await put(path, JSON.stringify({ sellerId }), { access: 'public', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' })
}

export async function getSellerIdByEmail(emailHash) {
  if (!safe(emailHash)) return null
  const record = await readJson(`${sellerEmailPrefix}${emailHash}.json`)
  return record?.sellerId || null
}

export async function saveVerificationCode(emailHash, record) {
  if (!safe(emailHash)) return
  await writeJson(`${verifyCodePrefix}${emailHash}.json`, record)
}

export async function getVerificationCode(emailHash) {
  if (!safe(emailHash)) return null
  return readJson(`${verifyCodePrefix}${emailHash}.json`)
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
  let cursor, count = 0
  do {
    const result = await list({ prefix: `${purchasePrefix}${listingId}/`, limit: 1000, ...(cursor ? { cursor } : {}) })
    count += result.blobs.length
    cursor = result.hasMore ? result.cursor : null
  } while (cursor)
  return count
}

export async function consumeDownload(sessionId, fileIndex, limit) {
  if (!safe(sessionId) || !Number.isInteger(fileIndex) || fileIndex < 0) return { allowed: false, remaining: 0 }
  if (!Number.isInteger(limit) || limit < 1) return { allowed: true, remaining: null }

  const pathname = `${entitlementPrefix}${sessionId}/${fileIndex}.json`
  for (let attempt = 0; attempt < 8; attempt++) {
    const result = await get(pathname, { access: 'public', useCache: false })
    if (result && result.statusCode !== 200) throw Error('Download allowance unavailable.')
    const current = result ? JSON.parse(await new Response(result.stream).text()) : null
    const count = Number(current?.count) || 0
    if (count >= limit) return { allowed: false, remaining: 0 }
    try {
      await put(pathname, JSON.stringify({ count: count + 1, updatedAt: Date.now() }), {
        access: 'public', addRandomSuffix: false, contentType: 'application/json',
        ...(result ? { ifMatch: result.blob.etag } : { allowOverwrite: false }),
      })
      return { allowed: true, remaining: Math.max(0, limit - count - 1) }
    } catch (error) {
      if (!/precondition|already exists/i.test(`${error.name} ${error.message}`)) throw error
    }
  }
  throw Error('Download allowance busy. Please retry.')
}


export async function setListingPaused(id, sellerId, paused) {
  if (!safe(id)) return null
  const path = `${listingPrefix}${id}.json`
  for (let attempt = 0; attempt < 8; attempt++) {
    const result = await get(path, { access: 'public', useCache: false })
    if (!result || result.statusCode !== 200) return null
    const listing = JSON.parse(await new Response(result.stream).text())
    if (listing.sellerId !== sellerId) return null
    try {
      await put(path, JSON.stringify({ ...listing, paused, updatedAt: Date.now() }), {
        access: 'public', addRandomSuffix: false, ifMatch: result.blob.etag, contentType: 'application/json',
      })
      return { id, paused }
    } catch (error) {
      if (!/precondition/i.test(`${error.name} ${error.message}`)) throw error
    }
  }
  throw Error('Listing update is busy. Please retry.')
}
