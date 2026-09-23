import { createHash } from 'node:crypto'
import { get, put } from '@vercel/blob'
import { readStoredBlob } from './blob-access'

const PRIVATE = { access: 'private' }

function pathFor(id) {
  if (!/^cs_(?:test_|live_)?[A-Za-z0-9_]+$/.test(id || '') || id.length > 240) throw Error('Invalid payment reference.')
  return `checkout-context/${createHash('sha256').update(id).digest('hex')}.json`
}
export async function checkoutContext(id) {
  const found = await readStoredBlob(pathFor(id), get)
  if (!found) return null
  return JSON.parse(await new Response(found.result.stream).text())
}

async function retrieveSession(client, id, scope) {
  try {
    return await client.checkout.sessions.retrieve(id, { expand: ['payment_intent.latest_charge'] }, scope)
  } catch {
    // A paid session must still open if the charge expansion is rejected.
    return client.checkout.sessions.retrieve(id, {}, scope)
  }
}
export async function saveCheckoutContext(sessionId, context) {
  const old = await checkoutContext(sessionId)
  if (old) {
    if (JSON.stringify(old) !== JSON.stringify(context)) throw Error('Payment context mismatch.')
    return
  }
  try { await put(pathFor(sessionId), JSON.stringify(context), {
    ...PRIVATE, addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json',
  }) } catch (error) {
    if (!/already exists|precondition/i.test(`${error.name} ${error.message}`)) throw error
    if (JSON.stringify(await checkoutContext(sessionId)) !== JSON.stringify(context)) throw Error('Payment context mismatch.')
  }
}
export function stripeScope(context) {
  return context?.accountId ? { stripeAccount: context.accountId } : {}
}
export async function retrieveCheckout(client, id, listingId, fallbackAccountId) {
  const context = await checkoutContext(id)
  if (context && listingId && context.listingId !== listingId) throw Error('Payment does not match listing.')
  const scope = stripeScope(context)
  let session
  try {
    session = await retrieveSession(client, id, scope)
  } catch (error) {
    if (scope.stripeAccount || !fallbackAccountId) throw error
    session = await retrieveSession(client, id, { stripeAccount: fallbackAccountId })
  }
  if (listingId && session.metadata?.file_id !== listingId) throw Error('Payment does not match listing.')
  if (context && (session.metadata?.seller_id !== context.sellerId || session.metadata?.file_id !== context.listingId)) throw Error('Invalid payment owner.')
  return session
}
export function paymentCanFulfill(session) {
  const charge = session.payment_intent?.latest_charge
  return session.mode === 'payment' && session.payment_status === 'paid'
    && !(charge && typeof charge === 'object' && (charge.refunded || charge.disputed))
}
