import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { runtime, catalog } from './integration-helper.mjs'

const env = { STRIPE_CTB_BILLING_ENABLED: 'true', STRIPE_CTB_WEBHOOK_SECRET: 'whsec_platform',
  STRIPE_CTB_CONNECT_WEBHOOK_SECRET: 'whsec_connect', STRIPE_CTB_PORTAL_CONFIGURATION: 'bpc_scoped' }

test('pause requires seller ownership; paused checkout closes while paid access remains valid', async () => {
  const app = runtime()
  const store = await app.load('lib/store.js')
  await store.saveSeller({ id: 'owner' })
  await store.saveSeller({ id: 'other' })
  await store.saveListing({ id: 'item', sellerId: 'owner', name: 'Sample' })
  const auth = await app.load('lib/seller.js')
  const route = await app.load('app/api/my-links/[id]/route.js')
  const req = (seller, paused, origin = 'https://app.test') => new Request('https://app.test/api/my-links/item', {
    method: 'PATCH', headers: { cookie: auth.sellerCookie(seller).split(';')[0], origin }, body: JSON.stringify({ paused }),
  })
  assert.equal((await route.PATCH(req('other', true), { params: { id: 'item' } })).status, 404)
  assert.equal((await route.PATCH(req('owner', true, 'https://evil.test'), { params: { id: 'item' } })).status, 403)
  assert.equal((await route.PATCH(req('owner', true), { params: { id: 'item' } })).status, 200)
  const checkout = await app.load('app/api/checkout/[id]/route.js')
  assert.equal((await checkout.POST(new Request('https://app.test/api/checkout/item', { method: 'POST' }), { params: { id: 'item' } })).status, 409)
  const payments = await app.load('lib/payment-context.js')
  assert.equal(payments.paymentCanFulfill({ mode: 'payment', payment_status: 'paid' }), true)
  assert.equal((await route.PATCH(req('owner', false), { params: { id: 'item' } })).status, 200)
  assert.equal((await store.getListing('item')).paused, false)
  assert.equal(auth.sellerIdFromRequest(new Request('https://app.test', { headers: { cookie: 'ctb_seller=%ZZ' } })), null)
})

test('legacy cheap links retain destination and agreed fee even after seller subscribes', async () => {
  const calls = []
  const app = runtime({ client: { checkout: { sessions: { create: async (args) => { calls.push(args); return { id: 'cs_test_legacy', url: 'https://checkout.stripe.com/example' } } } } }, mocks: {
    'lib/billing.js': { billingState: async () => { throw Error('Legacy checkout must not depend on subscriptions') } },
    'lib/stripe-connect.js': { readySubscriptionMerchant: async () => null, retrieveConnectedRecipient: async () => ({}), recipientStatus: () => ({ transfers: true }) },
  } })
  const store = await app.load('lib/store.js')
  await store.saveSeller({ id: 'owner', stripeAccountId: 'acct_old', feeBps: 500 })
  await store.saveListing({ id: 'old', sellerId: 'owner', name: 'Existing file', currency: 'usd', priceCents: 200, priceUsd: 2, feeBps: 100 })
  const route = await app.load('app/api/checkout/[id]/route.js')
  const result = await route.POST(new Request('https://app.test/api/checkout/old', { method: 'POST' }), { params: { id: 'old' } })
  assert.equal(result.status, 200)
  assert.equal(calls[0].payment_intent_data.application_fee_amount, 2)
  assert.equal(calls[0].payment_intent_data.transfer_data.destination, 'acct_old')
})

test('subscription checkout uses account identity, scoped portal, reuses sessions and rejects unready release', async () => {
  const sessions = [], subs = [], portals = []
  const client = { prices: { list: async () => ({ data: catalog() }) }, subscriptions: { list: async () => ({ data: subs }) },
    billingPortal: { sessions: { create: async (args) => { portals.push(args); return { url: 'https://billing.stripe.com/test' } } } },
    checkout: { sessions: {
      list: async () => ({ data: sessions }),
      create: async (args) => { const session = { ...args, id: 'cs_test_billing', status: 'open', url: 'https://checkout.stripe.com/test' }; sessions.push(session); return session },
    } },
  }
  const app = runtime({ client, env, mocks: { 'lib/stripe-connect.js': { readySubscriptionMerchant: async () => ({ id: 'acct_owner' }) } } })
  const store = await app.load('lib/store.js')
  await store.saveSeller({ id: 'owner', paymentAccountId: 'acct_owner' })
  const auth = await app.load('lib/seller.js')
  const route = await app.load('app/api/billing/checkout/route.js')
  const req = () => new Request('https://app.test/api/billing/checkout', { method: 'POST', headers: { cookie: auth.sellerCookie('owner').split(';')[0] }, body: '{"plan":"start"}' })
  assert.equal((await route.POST(req())).status, 200)
  assert.equal(sessions[0].customer_account, 'acct_owner')
  assert.equal(sessions[0].customer_update, undefined)
  assert.equal(sessions[0].subscription_data.metadata.seller_id, 'owner')
  assert.equal((await route.POST(req())).status, 200)
  assert.equal(sessions.length, 1)
  const now = Math.floor(Date.now() / 1000)
  subs.push({ id: 'sub_old', status: 'past_due', metadata: { seller_id: 'owner' }, items: { data: [{ quantity: 1, price: { id: 'price_start' }, current_period_start: now - 10, current_period_end: now + 1000 }] } })
  assert.equal((await route.POST(req())).status, 200)
  assert.equal(portals[0].configuration, 'bpc_scoped')
  assert.equal(sessions.length, 1)
})

test('subscription events reconcile current state, deduplicate and reject wrong customer/mode', async () => {
  const subscription = { id: 'sub_test', status: 'active', livemode: false, customer_account: 'acct_owner', metadata: { app: 'curl_to_buy', seller_id: 'owner' } }
  const app = runtime({ client: { subscriptions: { retrieve: async () => subscription }, webhooks: { constructEvent: (raw, sig) => { if (sig !== 'valid') throw Error(); return JSON.parse(raw) } } }, env })
  const store = await app.load('lib/store.js')
  await store.saveSeller({ id: 'owner', billingIdentity: { customer_account: 'acct_owner' } })
  const hook = await app.load('app/api/stripe/webhook/route.js')
  const event = { id: 'evt_one', livemode: false, type: 'customer.subscription.updated', data: { object: { id: 'sub_test', status: 'active' } } }
  const send = (sig = 'valid') => hook.POST(new Request('https://app.test/api/stripe/webhook', { method: 'POST', headers: { 'stripe-signature': sig }, body: JSON.stringify(event) }))
  assert.equal((await send('invalid')).status, 400)
  assert.equal((await send()).status, 200)
  const first = (await store.getSeller('owner')).billingSnapshot.checkedAt
  assert.equal((await send()).status, 200)
  assert.equal((await store.getSeller('owner')).billingSnapshot.checkedAt, first)
  event.id = 'evt_two'; subscription.status = 'canceled'
  assert.equal((await send()).status, 200)
  assert.equal((await store.getSeller('owner')).billingSnapshot.status, 'canceled')
  event.id = 'evt_three'; subscription.customer_account = 'acct_other'
  assert.equal((await send()).status, 503)
  subscription.customer_account = 'acct_owner'; event.livemode = true
  assert.equal((await send()).status, 503)
})

test('legacy stock initializes from historical purchases and holds delayed payments', async () => {
  let creates = 0
  const sessions = new Map()
  const client = { checkout: { sessions: {
    retrieve: async (id) => sessions.get(id),
    create: async () => { const value = { id: `cs_test_stock${++creates}`, status: 'open', payment_status: 'unpaid' }; sessions.set(value.id, value); return value },
  } } }
  const app = runtime({ client })
  const store = await app.load('lib/store.js')
  await store.recordPurchase('legacy', 'cs_test_prior')
  const reserve = await app.load('lib/checkout-reservations.js')
  const listing = { id: 'legacy', salesLimit: 2 }, context = { accountId: null, listingId: 'legacy', sellerId: 'owner', amount: 200, currency: 'usd' }
  const outcomes = await Promise.allSettled([1, 2].map(() => reserve.createReservedCheckout(client, listing, randomUUID(), { mode: 'payment' }, context)))
  assert.equal(outcomes.filter((x) => x.status === 'fulfilled').length, 1)
  const session = outcomes.find((x) => x.status === 'fulfilled').value
  session.status = 'complete' // delayed payment: not yet paid; retain stock
  await assert.rejects(() => reserve.createReservedCheckout(client, listing, randomUUID(), { mode: 'payment' }, context), /sold out/)
  assert.equal(creates, 1)
})

test('parallel downloads cannot exceed a one-download entitlement', async () => {
  const store = await runtime().load('lib/store.js')
  const results = await Promise.all([1, 2, 3].map(() => store.consumeDownload('cs_test_file', 0, 1)))
  assert.equal(results.filter((r) => r.allowed).length, 1)
})

test('expired attempt gets a new idempotency key while a pending attempt is reused', async () => {
  const keys = [], sessions = new Map()
  const client = { checkout: { sessions: {
    retrieve: async (id) => [...sessions.values()].find((s) => s.id === id),
    create: async (_, options) => {
      if (sessions.has(options.idempotencyKey)) return sessions.get(options.idempotencyKey)
      keys.push(options.idempotencyKey)
      const session = { id: `cs_test_retry${keys.length}`, status: 'open', payment_status: 'unpaid' }
      sessions.set(options.idempotencyKey, session)
      return session
    },
  } } }
  const app = runtime({ client }), reserve = await app.load('lib/checkout-reservations.js')
  const listing = { id: 'retry', salesLimit: 1 }, attempt = randomUUID(), context = { accountId: 'acct_test', listingId: 'retry' }
  const first = await reserve.createReservedCheckout(client, listing, attempt, {}, context)
  assert.equal((await reserve.createReservedCheckout(client, listing, attempt, {}, context)).id, first.id)
  first.status = 'expired'
  const next = await reserve.createReservedCheckout(client, listing, attempt, {}, context)
  assert.notEqual(next.id, first.id)
  assert.equal(keys.length, 2)
})
