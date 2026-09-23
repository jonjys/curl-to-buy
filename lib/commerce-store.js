import { createHash, randomUUID } from 'node:crypto'
import { get, put } from '@vercel/blob'

const PRIVATE = { access: 'private' }

// Only non-personal usage counters live here. Addresses and shipment details stay in Stripe.
export function listingIdFor(sellerId, requestId) {
  return createHash('sha256').update(`${sellerId}:${requestId}`).digest('hex').slice(0, 24)
}

async function read(path) {
  const result = await get(path, { ...PRIVATE, useCache: false })
  if (!result) return { value: {}, etag: null }
  if (result.statusCode !== 200) throw new Error('Could not read link usage.')
  return { value: JSON.parse(await new Response(result.stream).text()), etag: result.blob.etag }
}

function usagePath(sellerId, billing) {
  const key = createHash('sha256').update(`${sellerId}:${billing.subscriptionId}:${billing.periodStart}`).digest('hex')
  return `commerce-usage/${key}.json`
}

export async function linkUsage(sellerId, billing) {
  if (!billing.active) return 0
  const { value } = await read(usagePath(sellerId, billing))
  return (value.ids || []).length
}

export async function reserveLink(sellerId, billing, listingId) {
  const path = usagePath(sellerId, billing)
  for (let attempt = 0; attempt < 8; attempt++) {
    const { value, etag } = await read(path)
    const ids = value.ids || []
    if (ids.includes(listingId)) return
    if (billing.plan.links !== null && ids.length >= billing.plan.links) {
      const sv = billing.locale === 'sv'
      const error = new Error(sv
        ? 'Du har använt alla nya länkar för den här månaden. Uppgradera till Grow eller Scale, eller vänta till nästa period.'
        : 'You have used all new links for this billing month. Upgrade to Grow or Scale, or wait for renewal.')
      error.status = 402
      error.quotaExceeded = true
      throw error
    }
    try {
      await put(path, JSON.stringify({ ids: [...ids, listingId] }), {
        ...PRIVATE, addRandomSuffix: false, contentType: 'application/json',
        ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
      })
      return
    } catch (error) {
      if (!/precondition|already exists/i.test(`${error.name} ${error.message}`)) throw error
    }
  }
  throw new Error('Link creation is busy. Try again with the same draft.')
}

export async function withBillingLock(sellerId, work) {
  const path = `commerce-locks/${createHash('sha256').update(sellerId).digest('hex')}.json`
  const current = await read(path)
  if (current.value.until > Date.now()) throw new Error('Another billing request is in progress. Try again shortly.')
  const owner = randomUUID()
  const lock = await put(path, JSON.stringify({ owner, until: Date.now() + 180000 }), {
    ...PRIVATE, addRandomSuffix: false, contentType: 'application/json',
    ...(current.etag ? { ifMatch: current.etag } : { allowOverwrite: false }),
  })
  try { return await work() } finally {
    try {
      await put(path, JSON.stringify({ until: 0 }), { ...PRIVATE, addRandomSuffix: false, ifMatch: lock.etag, contentType: 'application/json' })
    } catch { /* The expiring lease is safe after an interrupted request. */ }
  }
}
