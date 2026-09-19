import { createHash } from 'node:crypto'
import { get, put } from '@vercel/blob'
import { withBillingLock } from './commerce-store'
import { saveCheckoutContext, stripeScope } from './payment-context'

export async function createReservedCheckout(client, listing, attemptId, params, context) {
  return withBillingLock(`checkout:${listing.id}`, async () => {
    const key = createHash('sha256').update(listing.id).digest('hex')
    const path = `checkout-reservations/${key}.json`
    const stored = await get(path, { access: 'public', useCache: false })
    if (stored && stored.statusCode !== 200) throw Error('Stock is unavailable.')
    const state = stored ? JSON.parse(await new Response(stored.stream).text()) : { entries: [], sold: 0 }
    const persist = () => put(path, JSON.stringify(state), {
      access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json',
    })
    const scope = stripeScope(context)
    const remaining = []
    let reused = null
    for (const entry of state.entries) {
      let session
      if (entry.sessionId) session = await client.checkout.sessions.retrieve(entry.sessionId, {}, stripeScope(entry.context))
      else {
        // Recover a process crash using EXACT original Stripe parameters.
        if (entry.expiresAt * 1000 + 86400000 < Date.now()) throw Error('A stock reservation needs reconciliation.')
        session = await client.checkout.sessions.create(entry.params, {
          ...stripeScope(entry.context), idempotencyKey: entry.key,
        })
        entry.sessionId = session.id
        await saveCheckoutContext(session.id, entry.context)
        delete entry.params
      }
      if (session.status === 'complete' || session.payment_status === 'paid') {
        state.sold += 1
        // Checkout only accepts immediately confirmed card payments here.
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
    const expiresAt = Math.floor(Date.now() / 1000) + 1860
    const keyId = `ctb-item-${listing.id}-${attemptId}`
    const entry = { attemptId, key: keyId, expiresAt, params: { ...params, expires_at: expiresAt }, context }
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
