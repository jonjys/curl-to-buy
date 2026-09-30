import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime, memoryBlob } from './integration-helper.mjs'

// The exact error real Vercel Blob returns to every writer when two conditional
// writes to one pathname land at the same instant (seen in the sandbox logs).
const conflict = () => Error('Vercel Blob: The conditional request cannot succeed due to a conflicting operation against this resource.')

// A runtime whose Blob store fails the next `times` writes under `prefix`, without writing.
// The wrapper must exist before modules load, because they bind `put` at import.
function conflictingRuntime(prefix, times) {
  const blob = memoryBlob()
  const put = blob.put
  const injected = { left: times }
  blob.put = async (path, text, opts) => {
    if (path.startsWith(prefix) && injected.left > 0) { injected.left--; throw conflict() }
    return put(path, text, opts)
  }
  return { app: runtime({ blob }), injected }
}

test('updateSeller retries a conflicting write and keeps both concurrent changes', async () => {
  const { app, injected } = conflictingRuntime('sellers/', 0)
  const store = await app.load('lib/store.js')
  await store.saveSeller({ id: 'owner' })
  injected.left = 2
  await Promise.all([store.updateSeller('owner', { a: 1 }), store.updateSeller('owner', { b: 2 })])
  assert.equal(injected.left, 0)
  const seller = await store.getSeller('owner')
  assert.equal(seller.a, 1)
  assert.equal(seller.b, 2)
})

test('consumeDownload retries a conflicting write and never exceeds the limit', async () => {
  const { app, injected } = conflictingRuntime('', 3)
  const store = await app.load('lib/store.js')
  const results = await Promise.all([1, 2, 3].map(() => store.consumeDownload('cs_test_dl', 0, 2)))
  assert.equal(injected.left, 0)
  assert.equal(results.filter((r) => r.allowed).length, 2)
  assert.equal(results.filter((r) => !r.allowed).length, 1)
})

test('reserveLink retries a conflicting write and counts every link once, within quota', async () => {
  const { app, injected } = conflictingRuntime('commerce-usage/', 3)
  const commerce = await app.load('lib/commerce-store.js')
  const billing = { active: true, subscriptionId: 'sub_test', periodStart: 1, plan: { links: 3 } }
  const settled = await Promise.allSettled(['l1', 'l2', 'l3', 'l4'].map((id) => commerce.reserveLink('owner', billing, id)))
  assert.equal(injected.left, 0)
  assert.equal(settled.filter((r) => r.status === 'fulfilled').length, 3)
  assert.equal(settled.filter((r) => r.reason?.quotaExceeded).length, 1)
  assert.equal(await commerce.linkUsage('owner', billing), 3)
})

test('saveCheckoutContext writes again after a conflict that left nothing behind', async () => {
  const { app, injected } = conflictingRuntime('checkout-context/', 2)
  const payment = await app.load('lib/payment-context.js')
  const context = { accountId: 'acct_x', listingId: 'item', sellerId: 'owner', amount: 1000, currency: 'sek' }
  // Before the fix: the conflict wrote nothing, the re-read found null and threw "Payment context mismatch."
  await Promise.all([payment.saveCheckoutContext('cs_test_ctx', context), payment.saveCheckoutContext('cs_test_ctx', context)])
  assert.equal(injected.left, 0)
  assert.equal(JSON.stringify(await payment.checkoutContext('cs_test_ctx')), JSON.stringify(context))
  // A different context for the same session is still refused.
  await assert.rejects(payment.saveCheckoutContext('cs_test_ctx', { ...context, amount: 1 }), /mismatch/)
})
