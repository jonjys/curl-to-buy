// Hermetic route-level contract test: no Stripe keys, real payments, uploads or external calls.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const root = new URL('../', import.meta.url)

async function loadRoute(path, dependencies) {
  const context = vm.createContext({
    process: { env: { STRIPE_CTB_WEBHOOK_SECRET: 'whsec_mock_only' } },
    console, Response, Request, URL, URLSearchParams, Headers, Date,
  })
  const source = await readFile(new URL(path, root), 'utf8')
  const route = new vm.SourceTextModule(source, { context, identifier: path })
  await route.link((specifier) => {
    const found = Object.entries(dependencies).find(([key]) => specifier === key || specifier.endsWith(key))
    assert.ok(found, `Unmocked module: ${specifier}`)
    const exports = found[1]
    return new vm.SyntheticModule(Object.keys(exports), function initialize() {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value)
    }, { context })
  })
  await route.evaluate()
  return route.namespace
}

test('Physical item -> Connect Checkout with shipping -> paid seller order -> sold out; no file download', async () => {
  const seller = { id: 'seller1', stripeAccountId: 'acct_test_mock_seller', feeBps: 500 }
  const state = { listing: null, session: null, checkoutArgs: null, sales: new Set(), sellerReady: true, sellerCookie: true }
  const client = {
    checkout: { sessions: {
      create: async (args) => {
        state.checkoutArgs = args
        state.session = {
          id: 'cs_test_physical_1', mode: 'payment', payment_status: 'unpaid',
          metadata: { ...args.metadata }, created: 1789720000, currency: 'sek', amount_total: 30000,
          customer_details: { email: 'buyer@example.test', name: 'Buyer Example' },
          collected_information: { shipping_details: {
            name: 'Buyer Example', address: { line1: 'Sample Street 1', postal_code: '11122', city: 'Stockholm', country: 'SE' },
          } },
        }
        return { ...state.session, url: 'https://checkout.stripe.com/mock-physical' }
      },
      retrieve: async (id) => {
        if (id !== state.session?.id) throw Error('Unknown mock session')
        return state.session
      },
    } },
    webhooks: { constructEvent: (body, signature, secret) => {
      if (signature !== 'v1=mock-valid' || secret !== 'whsec_mock_only') throw Error('Invalid signature')
      return JSON.parse(body)
    } },
  }
  const store = {
    saveListing: async (listing) => { state.listing = listing },
    getListing: async (id) => id === state.listing?.id ? state.listing : null,
    getSeller: async (id) => id === seller.id ? seller : null,
    getSalesCount: async () => state.sales.size,
    listingFiles: (listing) => listing?.files || [],
    recordPurchase: async (id, sessionId) => { state.sales.add(`${id}/${sessionId}`) },
  }
  const dependencies = {
    'lib/store': store,
    'lib/publish-listing': { publishListing: async (_, body, listing) => { state.listing = { ...listing, id: 'physical1' }; return state.listing } },
    'lib/billing': { billingState: async () => ({ active: false }) },
    'lib/payment-context': { saveCheckoutContext: async () => {}, checkoutContext: async () => null, retrieveCheckout: async (_, id) => client.checkout.sessions.retrieve(id), paymentCanFulfill: (s) => s.mode === 'payment' && s.payment_status === 'paid' },
    'lib/checkout-reservations': { createReservedCheckout: async () => { throw Error('Unexpected direct charge') } },
    'lib/id': { newId: () => 'physical1' },
    'lib/price': {
      parsePrice: (input) => Number(input.priceSek) >= 50 ? {
        currency: 'sek', priceSek: Number(input.priceSek), priceCents: Number(input.priceSek) * 100, priceUsd: null,
      } : null,
      displayPrice: (listing) => ({ currency: 'sek', amount: listing.priceCents, label: '300 SEK' }),
    },
    'lib/stripe': { stripe: () => client },
    'lib/stripe-connect': {
      loadReadySeller: async () => state.sellerReady ? seller : null,
      readySubscriptionMerchant: async () => null,
      recipientStatus: () => ({ transfers: true }),
      retrieveConnectedRecipient: async () => ({ id: seller.stripeAccountId }),
    },
    'lib/blob-error': { storageErrorMessage: () => 'Storage error' },
    'lib/site': { originFrom: () => 'https://example.test' },
    'lib/fees': { applicationFeeCents: (amount, bps) => Math.round(amount * bps / 10000) },
    'lib/seller': { sellerIdFromRequest: () => state.sellerCookie ? 'seller1' : null },
    '@vercel/blob': {
      list: async () => ({ blobs: [...state.sales].map((key) => ({ pathname: `purchases/${key}.json` })), hasMore: false }),
      get: async () => null,
    },
  }
  const register = await loadRoute('app/api/register-item/route.js', dependencies)
  const checkout = await loadRoute('app/api/checkout/[id]/route.js', dependencies)
  const webhook = await loadRoute('app/api/stripe/webhook/route.js', dependencies)
  const verify = await loadRoute('app/api/verify-session/route.js', dependencies)
  const orders = await loadRoute('app/api/item-orders/[id]/route.js', dependencies)
  const download = await loadRoute('app/api/download/[id]/route.js', {
    ...dependencies, 'lib/store': { ...store, consumeDownload: async () => ({ allowed: true }) },
  })
  const item = {
    title: 'Hoodie size M', description: 'Used once', condition: 'used_good',
    priceSek: 300, shippingIncluded: true,
  }
  state.sellerReady = false
  assert.equal((await register.POST(new Request('https://example.test/api/register-item', { method: 'POST', body: JSON.stringify(item) }))).status, 403)
  state.sellerReady = true
  assert.equal((await register.POST(new Request('https://example.test/api/register-item', { method: 'POST', body: JSON.stringify({ ...item, shippingIncluded: false }) }))).status, 400)
  const created = await register.POST(new Request('https://example.test/api/register-item', { method: 'POST', body: JSON.stringify(item) }))
  assert.equal(created.status, 200)
  assert.equal((await created.json()).kind, 'physical')
  assert.equal(state.listing.salesLimit, 1)
  assert.deepEqual(Array.from(state.listing.files), [])

  const checkoutRequest = new Request('https://example.test/api/checkout/physical1', { method: 'POST' })
  assert.equal((await checkout.POST(checkoutRequest, { params: Promise.resolve({ id: 'physical1' }) })).status, 200)
  assert.equal(state.checkoutArgs.shipping_address_collection.allowed_countries[0], 'SE')
  assert.equal(state.checkoutArgs.phone_number_collection.enabled, true)
  assert.equal(state.checkoutArgs.payment_intent_data.application_fee_amount, 1500)
  assert.equal(state.checkoutArgs.payment_intent_data.transfer_data.destination, seller.stripeAccountId)
  assert.equal(state.checkoutArgs.metadata.kind, 'physical')
  assert.equal(state.checkoutArgs.mode, 'payment')
  assert.equal(state.sales.size, 0)

  state.session.payment_status = 'paid' // Mocked state transition, no actual charge.
  const webhookRequest = () => new Request('https://example.test/api/stripe/webhook', {
    method: 'POST', headers: { 'stripe-signature': 'v1=mock-valid' },
    body: JSON.stringify({ id: 'evt_mock_physical', type: 'checkout.session.completed', data: { object: state.session } }),
  })
  assert.equal((await webhook.POST(webhookRequest())).status, 200)
  assert.equal((await webhook.POST(webhookRequest())).status, 200)
  assert.equal(state.sales.size, 1)
  const confirmed = await verify.GET(new Request('https://example.test/api/verify-session?session_id=cs_test_physical_1&listing_id=physical1'))
  const confirmation = await confirmed.json()
  assert.equal(confirmation.kind, 'physical')
  assert.equal(confirmation.files, undefined)
  assert.equal((await download.GET(new Request('https://example.test/api/download/physical1?session_id=cs_test_physical_1'), { params: Promise.resolve({ id: 'physical1' }) })).status, 404)

  state.sellerCookie = false
  assert.equal((await orders.GET(new Request('https://example.test/api/item-orders/physical1'), { params: Promise.resolve({ id: 'physical1' }) })).status, 401)
  state.sellerCookie = true
  const result = await orders.GET(new Request('https://example.test/api/item-orders/physical1'), { params: Promise.resolve({ id: 'physical1' }) })
  assert.equal(result.status, 200)
  const paidOrders = (await result.json()).orders
  assert.equal(paidOrders.length, 1)
  assert.equal(paidOrders[0].shippingAddress.city, 'Stockholm')
  assert.equal(paidOrders[0].buyerEmail, 'buyer@example.test')
  assert.equal((await checkout.POST(checkoutRequest, { params: Promise.resolve({ id: 'physical1' }) })).status, 410)
})

