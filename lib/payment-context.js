import { createHash } from 'node:crypto'
import { get, put } from '@vercel/blob'
import { isWriteRace, raceBackoff } from './blob-race'

const PRIVATE = { access: 'private' }

function pathFor(id) {
  if (!/^cs_(?:test_|live_)?[A-Za-z0-9_]+$/.test(id || '') || id.length > 240) throw Error('Invalid payment reference.')
  return `checkout-context/${createHash('sha256').update(id).digest('hex')}.json`
}
export async function checkoutContext(id) {
  const result = await get(pathFor(id), { ...PRIVATE, useCache: false })
  if (!result) return null
  if (result.statusCode !== 200) throw Error('Payment reference unavailable.')
  return JSON.parse(await new Response(result.stream).text())
}
export async function saveCheckoutContext(sessionId, context) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const old = await checkoutContext(sessionId)
    if (old) {
      if (JSON.stringify(old) !== JSON.stringify(context)) throw Error('Payment context mismatch.')
      return
    }
    try {
      await put(pathFor(sessionId), JSON.stringify(context), {
        ...PRIVATE, addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json',
      })
      return
    } catch (error) {
      // A lost race either left the other writer's context (checked on the next
      // pass) or, for a simultaneous conflict, nothing at all (written on the next pass).
      if (!isWriteRace(error)) throw error
      await raceBackoff()
    }
  }
  throw Error('Payment reference busy. Please retry.')
}
export function stripeScope(context) {
  return context?.accountId ? { stripeAccount: context.accountId } : {}
}
export async function retrieveCheckout(client, id, listingId) {
  const context = await checkoutContext(id)
  if (context && listingId && context.listingId !== listingId) throw Error('Payment does not match listing.')
  const session = await client.checkout.sessions.retrieve(id,
    { expand: ['payment_intent.latest_charge'] }, stripeScope(context))
  if (listingId && session.metadata?.file_id !== listingId) throw Error('Payment does not match listing.')
  if (context && (session.metadata?.seller_id !== context.sellerId || session.metadata?.file_id !== context.listingId)) throw Error('Invalid payment owner.')
  return session
}
export function paymentCanFulfill(session) {
  const charge = session.payment_intent?.latest_charge
  return session.mode === 'payment' && session.payment_status === 'paid'
    && !(charge && typeof charge === 'object' && (charge.refunded || charge.disputed))
}
