// Contract tests for direct-charge sales through the Connect webhook and for
// Customer Portal identity. In-memory Stripe and Blob only; no network calls.
import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime } from './integration-helper.mjs'

const env = { STRIPE_CTB_WEBHOOK_SECRET: 'whsec_platform', STRIPE_CTB_CONNECT_WEBHOOK_SECRET: 'whsec_connect',
  STRIPE_CTB_PORTAL_CONFIGURATION: 'bpc_scoped' }

async function directSale() {
  const session = { id: 'cs_test_direct', mode: 'payment', status: 'complete', payment_status: 'paid', account: 'acct_merchant',
    metadata: { file_id: 'dig1', seller_id: 'seller1' }, amount_total: 1500, currency: 'usd',
    payment_intent: { latest_charge: { refunded: false, disputed: false } } }
  const client = {
    webhooks: { constructEvent: (raw, signature, secret) => {
      if (signature !== `signed-with:${secret}`) throw Error('Bad signature')
      return JSON.parse(raw)
    } },
    checkout: { sessions: { retrieve: async (id, params, opts = {}) => {
      if (id !== session.id || opts.stripeAccount !== session.account) throw Error('Wrong Stripe account scope')
      return session
    } } },
  }
  const app = runtime({ client, env })
  const store = await app.load('lib/store.js')
  await store.saveListing({ id: 'dig1', sellerId: 'seller1', kind: 'digital', name: 'Guide', billingMode: 'freemium',
    paymentAccountId: 'acct_merchant', files: [{ name: 'guide.txt', blobPathname: 'files/guide.txt', size: 5, type: 'text/plain' }] })
  await app.blob.put('files/guide.txt', 'guide', { access: 'private' })
  const context = await app.load('lib/payment-context.js')
  await context.saveCheckoutContext(session.id, { accountId: 'acct_merchant', sellerId: 'seller1', listingId: 'dig1', amount: 1500, currency: 'usd' })
  const event = (type, account, secret) => new Request('https://app.test/api/stripe/webhook', {
    method: 'POST', headers: { 'stripe-signature': `signed-with:${secret}` },
    body: JSON.stringify({ id: `evt_${type}`, type, account, data: { object: session } }),
  })
  return {
    session, store, event,
    platform: await app.load('app/api/stripe/webhook/route.js'),
    connect: await app.load('app/api/stripe/connect-webhook/route.js'),
    verify: await app.load('app/api/verify-session/route.js'),
    download: await app.load('app/api/download/[id]/route.js'),
  }
}

test('direct sale is registered by the Connect webhook alone, once, with its own secret and scope', async () => {
  const { store, event, platform, connect } = await directSale()
  const sold = () => store.getSalesCount('dig1')

  // Wrong secret on either endpoint, or a connected-account event on the platform endpoint, registers nothing.
  assert.equal((await connect.POST(event('checkout.session.completed', 'acct_merchant', 'whsec_platform'))).status, 400)
  assert.equal((await platform.POST(event('checkout.session.completed', 'acct_merchant', 'whsec_connect'))).status, 400)
  assert.equal((await platform.POST(event('checkout.session.completed', 'acct_merchant', 'whsec_platform'))).status, 400)
  assert.equal((await connect.POST(event('checkout.session.completed', undefined, 'whsec_connect'))).status, 400)
  assert.equal((await connect.POST(event('checkout.session.completed', 'acct_other', 'whsec_connect'))).status, 400)
  assert.equal(await sold(), 0)

  // The buyer never opens the success page; the signed Connect event registers the sale.
  assert.equal((await connect.POST(event('checkout.session.completed', 'acct_merchant', 'whsec_connect'))).status, 200)
  assert.equal(await sold(), 1)

  // Stripe retries and the delayed-payment event do not count it again.
  assert.equal((await connect.POST(event('checkout.session.completed', 'acct_merchant', 'whsec_connect'))).status, 200)
  assert.equal((await connect.POST(event('checkout.session.async_payment_succeeded', 'acct_merchant', 'whsec_connect'))).status, 200)
  assert.equal(await sold(), 1)
})

test('success page and download after the Connect webhook do not register the sale twice', async () => {
  const { store, event, connect, verify, download, session } = await directSale()
  assert.equal((await connect.POST(event('checkout.session.completed', 'acct_merchant', 'whsec_connect'))).status, 200)
  const paid = await verify.GET(new Request(`https://app.test/api/verify-session?session_id=${session.id}&listing_id=dig1`))
  assert.equal((await paid.json()).status, 'paid')
  const file = await download.GET(new Request(`https://app.test/api/download/dig1?session_id=${session.id}&file=0`), { params: Promise.resolve({ id: 'dig1' }) })
  assert.equal(file.status, 200)
  assert.equal(await file.text(), 'guide')
  assert.equal(await store.getSalesCount('dig1'), 1)
})

test('Customer Portal opens only for the signed-in seller, with the stored identity and scoped configuration', async () => {
  const portals = []
  const client = { billingPortal: { sessions: { create: async (args) => { portals.push(args); return { url: 'https://billing.stripe.com/p/test' } } } } }
  const app = runtime({ client, env })
  const store = await app.load('lib/store.js')
  await store.saveSeller({ id: 'owner', billingIdentity: { customer_account: 'acct_owner' } })
  await store.saveSeller({ id: 'other', billingIdentity: { customer_account: 'acct_other' } })
  await store.saveSeller({ id: 'noplan' })
  const auth = await app.load('lib/seller.js')
  const route = await app.load('app/api/billing/portal/route.js')
  const post = (headers) => route.POST(new Request('https://app.test/api/billing/portal', {
    method: 'POST', headers: { host: 'app.test', 'Content-Type': 'application/json', ...headers },
    // A client-supplied identity is ignored.
    body: JSON.stringify({ customer: 'cus_attacker', customer_account: 'acct_other' }),
  }))
  const cookie = (id) => ({ cookie: auth.sellerCookie(id).split(';')[0] })

  assert.equal((await post({})).status, 403)
  assert.equal((await post({ cookie: 'ctb_seller=owner.forged' })).status, 403)
  assert.equal((await post({ ...cookie('owner'), origin: 'https://evil.test' })).status, 403)
  assert.equal((await post(cookie('noplan'))).status, 403)
  assert.equal(portals.length, 0)

  assert.equal((await post(cookie('owner'))).status, 200)
  assert.equal(portals.length, 1)
  assert.equal(portals[0].customer_account, 'acct_owner')
  assert.equal(portals[0].customer, undefined)
  assert.equal(portals[0].configuration, 'bpc_scoped')
  assert.equal(portals[0].return_url, 'https://app.test/plans')
})
