import { createHash, randomUUID } from 'node:crypto'
import { get, put } from '@vercel/blob'

// Only non-personal usage counters live here. Addresses and shipment details stay in Stripe.
export function listingIdFor(sellerId, requestId) {
  return createHash('sha256').update(`${sellerId}:${requestId}`).digest('hex').slice(0, 24)
}

async function read(path) {
  const result = await get(path, { access: 'public', useCache: false })
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
      const error = new Error('You have used all new links for this billing month. Upgrade your plan or wait for renewal.')
      error.status = 402
      throw error
    }
    try {
      await put(path, JSON.stringify({ ids: [...ids, listingId] }), {
        access: 'public', addRandomSuffix: false, contentType: 'application/json',
        ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
      })
      return
    } catch (error) {
      if (!/precondition|already exists/i.test(`${error.name} ${error.message}`)) throw error
    }
  }
  throw new Error('Link creation is busy. Try again with the same draft.')
}

// Serialize subscription-session creation across serverless instances. The lease
// exceeds this route's 60-second maximum duration; Stripe idempotency is an
// additional guard if the function dies before releasing it.
export async function withBillingLock(sellerId, work) {
  const path = `commerce-locks/${createHash('sha256').update(sellerId).digest('hex')}.json`
  const current = await read(path)
  if (current.value.until > Date.now()) throw new Error('Another billing request is in progress. Try again shortly.')
  const owner = randomUUID()
  const lock = await put(path, JSON.stringify({ owner, until: Date.now() + 180000 }), {
    access: 'public', addRandomSuffix: false, contentType: 'application/json',
    ...(current.etag ? { ifMatch: current.etag } : { allowOverwrite: false }),
  })
  try { return await work() } finally {
    try {
      await put(path, JSON.stringify({ until: 0 }), { access: 'public', addRandomSuffix: false, ifMatch: lock.etag, contentType: 'application/json' })
    } catch { /* The expiring lease is safe after an interrupted request. */ }
  }
}
