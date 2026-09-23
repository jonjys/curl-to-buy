import { createHash, randomUUID } from 'node:crypto'
import { get, put } from '@vercel/blob'
import { readStoredBlob } from './blob-access'
import { getSalesCount } from './store'
import { withBillingLock } from './commerce-store'
import { saveCheckoutContext, stripeScope } from './payment-context'

const MIN_CHECKOUT_SECONDS = 30 * 60
const CHECKOUT_SECONDS = 60 * 60

function openUntil(params) {
  const expiresAt = Math.floor(Date.now() / 1000) + CHECKOUT_SECONDS
  return { expiresAt, params: { ...params, expires_at: expiresAt } }
}

export async function createReservedCheckout(client, listing, attemptId, params, context) {
  return withBillingLock(`checkout:${listing.id}`, async () => {
    const key = createHash('sha256').update(listing.id).digest('hex')
    const path = `checkout-reservations/${key}.json`
    const stored = await readStoredBlob(path, get)
    const state = stored ? JSON.parse(await new Response(stored.result.stream).text()) : { entries: [], sold: await getSalesCount(listing.id) }
    const access = stored?.access || 'private'
    const persist = () => put(path, JSON.stringify(state), {
      access, addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
    })
    const scope = stripeScope(context)
    const remaining = []
    let reused = null
    for (const entry of state.entries) {
      let session
      if (entry.sessionId) session = await client.checkout.sessions.retrieve(entry.sessionId, {}, stripeScope(entry.context))
      else {
        const earliest = Math.floor(Date.now() / 1000) + MIN_CHECKOUT_SECONDS
        if (!entry.params || !entry.expiresAt || entry.expiresAt < earliest) continue
        session = await client.checkout.sessions.create(entry.params, {
          ...stripeScope(entry.context), idempotencyKey: entry.key,
        })
        entry.sessionId = session.id
        await saveCheckoutContext(session.id, entry.context)
        delete entry.params
      }
      if (session.status === 'complete' || session.payment_status === 'paid') {
        state.sold += 1
      } else if (session.status !== 'expired') {
        remaining.push(entry)
        if (entry.attemptId === attemptId) reused = session
      }
    }
    state.entries = remaining
    await persist()
    if (reused) return reused
    if (state.sold + state.entries.length >= listing.salesLimit) {
      const error = Error(state.sold >= listing.salesLimit ? 'This item is sold out.' : 'Another buyer is checking out. Please try again later.')
      error.status = state.sold >= listing.salesLimit ? 410 : 409
      throw error
    }
    const opened = openUntil(params)
    const keyId = `ctb-item-${listing.id}-${randomUUID()}`
    const entry = { attemptId, key: keyId, expiresAt: opened.expiresAt, params: opened.params, context }
    state.entries.push(entry)
    await persist()
    const session = await client.checkout.sessions.create(entry.params, { ...scope, idempotencyKey: keyId })
    await saveCheckoutContext(session.id, context)
    entry.sessionId = session.id
    delete entry.params
    await persist()
    return session
  })
}
