import { put, get } from '@vercel/blob'

const prefix = 'listings/'
const sellerPrefix = 'sellers/'
const accountIndexPrefix = 'accounts/'
const emailIndexPrefix = 'recovery-emails/'
const recoveryTokenPrefix = 'recovery-tokens/'

export async function saveListing(listing) {
  await put(`${prefix}${listing.id}.json`, JSON.stringify(listing), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  })
  return listing
}

export async function getListing(id) {
  if (!id || /[^a-zA-Z0-9_-]/.test(id)) return null
  try {
    const result = await get(`${prefix}${id}.json`, { access: 'public' })
    if (!result || result.statusCode !== 200) return null
    const text = await new Response(result.stream).text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Merge fields into an existing listing and persist it. Returns the updated
// listing, or null if it no longer exists.
export async function updateListing(id, patch) {
  const listing = await getListing(id)
  if (!listing) return null
  const next = { ...listing, ...patch }
  await saveListing(next)
  return next
}

// Sellers hold the Stripe Connect account and are looked up only from a
// possession-based cookie (see lib/seller.js) — never from a public listing
// id, which anyone can see in a shared buy link.
export async function saveSeller(seller) {
  await put(`${sellerPrefix}${seller.id}.json`, JSON.stringify(seller), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  })
  return seller
}

export async function getSeller(id) {
  if (!id || /[^a-f0-9]/.test(id)) return null
  try {
    const result = await get(`${sellerPrefix}${id}.json`, { access: 'public' })
    if (!result || result.statusCode !== 200) return null
    const text = await new Response(result.stream).text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function updateSeller(id, patch) {
  const seller = await getSeller(id)
  if (!seller) return null
  const next = { ...seller, ...patch }
  await saveSeller(next)
  return next
}

// Reverse index: Stripe connected-account id -> sellerId. A Connect webhook
// event only carries the Stripe account id, so this is how we find which
// seller record to update.
export async function saveAccountIndex(stripeAccountId, sellerId) {
  if (!stripeAccountId || /[^a-zA-Z0-9_]/.test(stripeAccountId)) return
  await put(`${accountIndexPrefix}${stripeAccountId}.json`, JSON.stringify({ sellerId }), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  })
}

export async function getSellerIdByAccountId(stripeAccountId) {
  if (!stripeAccountId || /[^a-zA-Z0-9_]/.test(stripeAccountId)) return null
  try {
    const result = await get(`${accountIndexPrefix}${stripeAccountId}.json`, { access: 'public' })
    if (!result || result.statusCode !== 200) return null
    const text = await new Response(result.stream).text()
    return JSON.parse(text)?.sellerId || null
  } catch {
    return null
  }
}

// Reverse index: sha256(lowercased recovery email) -> sellerId. Looking a
// seller up by the hash (never by scanning raw emails) is how
// /api/connect/recover-request finds who to email without needing to list
// every seller record.
export async function saveEmailIndex(emailHash, sellerId) {
  if (!emailHash || /[^a-f0-9]/.test(emailHash)) return
  await put(`${emailIndexPrefix}${emailHash}.json`, JSON.stringify({ sellerId }), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  })
}

export async function getSellerIdByEmailHash(emailHash) {
  if (!emailHash || /[^a-f0-9]/.test(emailHash)) return null
  try {
    const result = await get(`${emailIndexPrefix}${emailHash}.json`, { access: 'public' })
    if (!result || result.statusCode !== 200) return null
    const text = await new Response(result.stream).text()
    return JSON.parse(text)?.sellerId || null
  } catch {
    return null
  }
}

// One-time recovery tokens. The token string itself is the high-entropy key
// (same shape as a seller secret) — knowing it is what makes it usable, same
// as any emailed magic link.
export async function saveRecoveryToken(token, data) {
  if (!token || /[^a-f0-9]/.test(token)) return
  await put(`${recoveryTokenPrefix}${token}.json`, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  })
}

export async function getRecoveryToken(token) {
  if (!token || /[^a-f0-9]/.test(token)) return null
  try {
    const result = await get(`${recoveryTokenPrefix}${token}.json`, { access: 'public' })
    if (!result || result.statusCode !== 200) return null
    const text = await new Response(result.stream).text()
    return JSON.parse(text)
  } catch {
    return null
  }
}
