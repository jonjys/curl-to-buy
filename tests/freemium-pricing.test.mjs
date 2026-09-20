import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { runtime, catalog } from './integration-helper.mjs'

function sellerFixture({ subscribed = false } = {}) {
  const now = Math.floor(Date.now() / 1000)
  const seller = {
    id: 'seller1', email: 'seller@example.test', stripeAccountId: 'acct_old',
    paymentAccountId: 'acct_merchant', billingIdentity: { customer_account: 'acct_merchant' }, feeBps: 500,
  }
  const state = {
    creates: [], next: 1, merchant: true,
    sub: subscribed ? {
      id: 'sub_seller1', status: 'active', metadata: { seller_id: 'seller1' },
      items: { data: [{ quantity: 1, price: { id: 'price_start' }, current_period_start: now - 1000, current_period_end: now + 200000 }] },
    } : null,
  }
  const client = {
    prices: { list: async () => ({ data: catalog() }) },
    subscriptions: { list: async () => ({ data: state.sub ? [state.sub] : [] }) },
    checkout: { sessions: { create: async (args, opts = {}) => {
      state.creates.push({ args, opts })
      return { id: `cs_test_${state.next++}`, url: 'https://checkout.stripe.com/freemium', metadata: args.metadata }
    } } },
  }
  const app = runtime({
    client,
    mocks: {
      'lib/stripe-connect.js': {
        loadReadySeller: async () => state.merchant ? seller : null,
        readySubscriptionMerchant: async () => state.merchant ? { id: seller.paymentAccountId } : null,
        retrieveConnectedRecipient: async () => ({}),
        recipientStatus: () => ({ transfers: true }),
      },
    },
  })
  return { app, client, state, seller }
}

async function registerDigital(app, seller, priceUsd, extras = {}) {
  await (await app.load('lib/store.js')).saveSeller(seller)
  const auth = await app.load('lib/seller.js')
  const cookie = auth.sellerCookie(seller.id).split(';')[0]
  const register = await app.load('app/api/register/route.js')
  return register.POST(new Request('https://app.test/api/register', {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId: randomUUID(), accepted: true, locale: 'en',
      files: [{ name: 'pack.zip', blobPathname: 'uploads/pack.zip', size: 12, type: 'application/zip' }],
      title: 'Pack', priceUsd, ...extras,
    }),
  }))
}

test('free sellers: $1 and $4.99 rejected, $10 published with 5% checkout fee', async () => {
  const { app, seller, state } = sellerFixture({ subscribed: false })
  assert.equal((await registerDigital(app, seller, 1)).status, 400)
  assert.equal((await registerDigital(app, seller, 4.99)).status, 400)
  const created = await registerDigital(app, seller, 10)
  assert.equal(created.status, 200)
  const { id } = await created.json()
  const listing = await (await app.load('lib/store.js')).getListing(id)
  assert.equal(listing.billingMode, 'freemium')
  assert.equal(listing.feeBps, 500)
  assert.equal(listing.priceUsd, 10)
  const checkout = await app.load('app/api/checkout/[id]/route.js')
  const pay = await checkout.POST(new Request(`https://app.test/api/checkout/${id}`, { method: 'POST', body: '{}' }), { params: { id } })
  assert.equal(pay.status, 200)
  assert.equal(state.creates[0].args.payment_intent_data.application_fee_amount, 50)
  assert.equal(state.creates[0].args.payment_intent_data.transfer_data, undefined)
  assert.equal(state.creates[0].opts.stripeAccount, 'acct_merchant')
})

test('subscribed sellers: $1 and $4.99 rejected, $5 published with 0% checkout fee', async () => {
  const { app, seller, state } = sellerFixture({ subscribed: true })
  assert.equal((await registerDigital(app, seller, 1)).status, 400)
  assert.equal((await registerDigital(app, seller, 4.99)).status, 400)
  const created = await registerDigital(app, seller, 5)
  assert.equal(created.status, 200)
  const { id } = await created.json()
  const listing = await (await app.load('lib/store.js')).getListing(id)
  assert.equal(listing.billingMode, 'subscription')
  assert.equal(listing.feeBps, 0)
  const checkout = await app.load('app/api/checkout/[id]/route.js')
  const pay = await checkout.POST(new Request(`https://app.test/api/checkout/${id}`, { method: 'POST', body: '{}' }), { params: { id } })
  assert.equal(pay.status, 200)
  assert.equal(state.creates[0].args.payment_intent_data.application_fee_amount, 0)
  assert.equal(state.creates[0].args.payment_intent_data.transfer_data, undefined)
  assert.equal(state.creates[0].opts.stripeAccount, 'acct_merchant')
})

test('entitlement tokens: free $10/5%, subscribed $5/0%, zero bps takes no cent', async () => {
  const app = runtime()
  const entitlement = await app.load('lib/entitlement.js')
  const fees = await app.load('lib/fees.js')
  const price = await app.load('lib/price.js')
  assert.equal(JSON.stringify(entitlement.saleTerms(false).presets), '[10,15,29]')
  assert.equal(JSON.stringify(entitlement.saleTerms(true).presets), '[5,9,29]')
  assert.equal(entitlement.saleTerms(false).feeBps, 500)
  assert.equal(entitlement.saleTerms(true).feeBps, 0)
  assert.equal(price.parsePrice({ priceUsd: 1 }, { minUsd: 10 }), null)
  assert.equal(price.parsePrice({ priceUsd: 4.99 }, { minUsd: 5 }), null)
  assert.equal(price.parsePrice({ priceUsd: 10 }, { minUsd: 10 }).priceCents, 1000)
  assert.equal(price.parsePrice({ priceUsd: 5 }, { minUsd: 5 }).priceCents, 500)
  assert.equal(fees.applicationFeeCents(1000, 500), 50)
  assert.equal(fees.applicationFeeCents(500, 0), 0)
  assert.equal(price.parsePrice({ priceUsd: 5 }), null)
  assert.equal(entitlement.usesDirectCharge({ billingMode: 'freemium' }), true)
  assert.equal(entitlement.usesDirectCharge({ billingMode: 'subscription' }), true)
  assert.equal(entitlement.usesDirectCharge({ paymentAccountId: 'acct_x' }), true)
  assert.equal(entitlement.usesDirectCharge({}), false)
})

test('physical items require a title and reject prices below the entitlement floor', async () => {
  const { app, seller } = sellerFixture({ subscribed: false })
  await (await app.load('lib/store.js')).saveSeller(seller)
  const auth = await app.load('lib/seller.js')
  const cookie = auth.sellerCookie(seller.id).split(';')[0]
  const register = await app.load('app/api/register-item/route.js')
  const post = (body) => register.POST(new Request('https://app.test/api/register-item', {
    method: 'POST',
    headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: randomUUID(), accepted: true, locale: 'en', condition: 'new', shippingIncluded: true, shippingCountries: ['SE'], ...body }),
  }))
  assert.equal((await post({ title: '', priceSek: 300 })).status, 400)
  assert.equal((await post({ title: 'Hoodie size M', priceSek: 50 })).status, 400)
  assert.equal((await post({ title: 'Hoodie size M', priceSek: 100 })).status, 200)
})

test('new listings never destination-charge; $1 checkout is rejected for both entitlements', async () => {
  const { app, seller, state } = sellerFixture({ subscribed: true })
  const store = await app.load('lib/store.js')
  await store.saveSeller(seller)
  const checkout = await app.load('app/api/checkout/[id]/route.js')

  await store.saveListing({
    id: 'cheap_sub', name: 'Cheap', sellerId: seller.id, billingMode: 'subscription',
    paymentAccountId: seller.paymentAccountId, currency: 'usd', priceUsd: 1, priceCents: 100,
    files: [{ name: 'a.txt', blobPathname: 'uploads/a.txt' }],
  })
  assert.equal((await checkout.POST(new Request('https://app.test/api/checkout/cheap_sub', { method: 'POST', body: '{}' }), { params: { id: 'cheap_sub' } })).status, 400)

  await store.saveListing({
    id: 'new_no_merchant', name: 'New', sellerId: seller.id, billingMode: 'freemium',
    currency: 'usd', priceUsd: 10, priceCents: 1000,
    files: [{ name: 'a.txt', blobPathname: 'uploads/a.txt' }],
  })
  state.merchant = false
  const refused = await checkout.POST(new Request('https://app.test/api/checkout/new_no_merchant', { method: 'POST', body: '{}' }), { params: { id: 'new_no_merchant' } })
  assert.equal(refused.status, 409)
  assert.equal(state.creates.length, 0)
})
