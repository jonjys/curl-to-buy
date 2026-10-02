import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime } from './integration-helper.mjs'

const env = { RESEND_API_KEY: 're_test_contract_only' }

function recoveryApp() {
  const sent = []
  const fetch = async (url, init) => {
    assert.equal(url, 'https://api.resend.com/emails')
    sent.push(JSON.parse(init.body))
    return new Response('{}', { status: 200 })
  }
  return { app: runtime({ env, fetch }), sent }
}

const request = (route, email) => route.POST(new Request('https://app.test/api/recover/request', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
}))

test('a seller created before the email index can still recover, and gets indexed', async () => {
  const { app, sent } = recoveryApp()
  const store = await app.load('lib/store.js')
  const { emailKey } = await app.load('lib/seller.js')
  // Two old sellers with the same email and no index: the older one never finished Stripe.
  await store.saveSeller({ id: 'old_unfinished', email: 'legacy@example.com', stripeAccountId: 'acct_a', createdAt: 1 })
  await store.saveSeller({ id: 'old_ready', email: 'Legacy@Example.com', stripeAccountId: 'acct_b', createdAt: 2 })
  await store.saveSeller({ id: 'other', email: 'someone@example.com', stripeAccountId: 'acct_c', createdAt: 3 })
  const route = await app.load('app/api/recover/request/route.js')

  const res = await request(route, 'legacy@example.com')
  assert.equal(res.status, 200)
  assert.equal(sent.length, 1)
  assert.equal(String(sent[0].to), 'legacy@example.com')
  // The newest matching seller is chosen and the index is filled in for next time.
  assert.equal(await store.getSellerIdByEmail(emailKey('legacy@example.com')), 'old_ready')
  assert.equal((await store.getVerificationCode(emailKey('legacy@example.com'))).sellerId, 'old_ready')
})

test('an unknown email still answers ok and sends nothing', async () => {
  const { app, sent } = recoveryApp()
  const store = await app.load('lib/store.js')
  await store.saveSeller({ id: 'other', email: 'someone@example.com', stripeAccountId: 'acct_c', createdAt: 3 })
  const route = await app.load('app/api/recover/request/route.js')
  const res = await request(route, 'nobody@example.com')
  assert.equal(res.status, 200)
  assert.equal(sent.length, 0)
})
