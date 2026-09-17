// Hermetic contract tests. No Stripe keys, charges, real blobs or HTTP calls.
// Exercises the actual Next.js route source with in-memory Stripe/Blob adapters.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const root = new URL('../', import.meta.url)

async function loadRoute(path, dependencies, env) {
  const context = vm.createContext({
    process: { env }, console, Response, Request, URL, Headers, Date,
  })
  const source = await readFile(new URL(path, root), 'utf8')
  const route = new vm.SourceTextModule(source, { context, identifier: path })
  await route.link((specifier) => {
    const match = Object.entries(dependencies).find(([key]) => specifier === key || specifier.endsWith(key))
    assert.ok(match, `Unmocked import in ${path}: ${specifier}`)
    const exports = match[1]
    return new vm.SyntheticModule(Object.keys(exports), function initialize() {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value)
    }, { context })
  })
  await route.evaluate()
  return route.namespace
}

async function setup() {
  const sales = new Set()
  const downloads = new Map()
  const listing = {
    id: 'listing1', name: 'Example file', sellerId: 'seller1',
    files: [{ name: 'example.txt', blobPathname: 'files/example.txt', type: 'text/plain' }],
    downloadsPerFile: 1, salesLimit: 1,
  }
  const seller = { id: 'seller1', stripeAccountId: 'acct_test_seller', feeBps: 500 }
  const state = { listing, seller, sales, downloads, session: null, checkoutArgs: null, transfersEnabled: true }
  const client = {
    checkout: { sessions: {
      create: async (args) => {
        state.checkoutArgs = args
        state.session = {
          id: 'cs_test_contract_1', mode: 'payment', payment_status: 'unpaid',
          metadata: { ...args.metadata }, customer_details: { email: 'buyer@example.test' },
        }
        return { url: 'https://checkout.stripe.com/test-contract' }
      },
      retrieve: async (id) => {
        if (id !== state.session?.id) throw Error('Unknown test session')
        return state.session
      },
    } },
    webhooks: {
      constructEvent: (raw, signature, secret) => {
        if (signature !== 'v1=mock-valid' || secret !== 'whsec_mock_only') throw Error('Bad signature')
        return JSON.parse(raw)
      },
    },
  }
  const store = {
    getListing: async (id) => id === listing.id ? state.listing : null,
    getSeller: async (id) => id === seller.id ? state.seller : null,
    getSalesCount: async () => sales.size,
    listingFiles: (item) => item?.files || [],
    recordPurchase: async (id, session) => { sales.add(`${id}/${session}`) },
    consumeDownload: async (session, index, limit) => {
      const key = `${session}/${index}`
      const used = downloads.get(key) || 0
      if (Number.isInteger(limit) && used >= limit) return { allowed: false, remaining: 0 }
      downloads.set(key, used + 1)
      return { allowed: true, remaining: Number.isInteger(limit) ? limit - used - 1 : null }
    },
  }
  const dependencies = {
    'lib/stripe': { stripe: () => client },
    'lib/store': store,
    'lib/price': { displayPrice: () => ({ currency: 'sek', amount: 5000 }) },
    'lib/site': { originFrom: () => 'https://example.test' },
    'lib/fees': { applicationFeeCents: (amount, bps) => Math.round(amount * bps / 10000) },
    'lib/stripe-connect': {
      recipientStatus: () => ({ transfers: state.transfersEnabled }),
      retrieveConnectedRecipient: async () => ({ id: seller.stripeAccountId }),
    },
    '@vercel/blob': { get: async (path) => path === 'files/example.txt'
      ? { statusCode: 200, stream: new Response('example file contents').body, blob: { contentType: 'text/plain' } }
      : null },
  }
  const env = { STRIPE_CTB_WEBHOOK_SECRET: 'whsec_mock_only' }
  return {
    state, client, dependencies, env,
    checkout: await loadRoute('app/api/checkout/[id]/route.js', dependencies, env),
    webhook: await loadRoute('app/api/stripe/webhook/route.js', dependencies, env),
    verify: await loadRoute('app/api/verify-session/route.js', dependencies, env),
    download: await loadRoute('app/api/download/[id]/route.js', dependencies, env),
  }
}

function eventRequest(type, session, signature = 'v1=mock-valid') {
  return new Request('https://example.test/api/stripe/webhook', {
    method: 'POST', headers: { 'stripe-signature': signature },
    body: JSON.stringify({ id: 'evt_test_contract_1', type, data: { object: session } }),
  })
}

test('Checkout -> paid webhook -> idempotent order -> gated file -> download cap', async () => {
  const { state, checkout, webhook, verify, download } = await setup()
  const created = await checkout.POST(new Request('https://example.test/api/checkout/listing1', { method: 'POST' }),
    { params: Promise.resolve({ id: 'listing1' }) })
  assert.equal(created.status, 200)
  assert.equal((await created.json()).url, 'https://checkout.stripe.com/test-contract')
  assert.equal(state.checkoutArgs.mode, 'payment')
  assert.equal(state.checkoutArgs.payment_intent_data.application_fee_amount, 250)
  assert.equal(state.checkoutArgs.payment_intent_data.transfer_data.destination, 'acct_test_seller')
  assert.equal(state.checkoutArgs.metadata.file_id, 'listing1')

  const verifyUrl = 'https://example.test/api/verify-session?session_id=cs_test_contract_1&listing_id=listing1'
  const downloadUrl = 'https://example.test/api/download/listing1?session_id=cs_test_contract_1&file=0'
  const pending = await verify.GET(new Request(verifyUrl))
  assert.equal((await pending.json()).status, 'unpaid')
  assert.equal((await download.GET(new Request(downloadUrl), { params: Promise.resolve({ id: 'listing1' }) })).status, 402)
  assert.equal(state.sales.size, 0)

  state.session.payment_status = 'paid' // Simulated Stripe success; NO real charge is made.
  assert.equal((await webhook.POST(eventRequest('checkout.session.completed', state.session))).status, 200)
  assert.equal(state.sales.size, 1)
  const confirmed = await verify.GET(new Request(verifyUrl))
  assert.equal((await confirmed.json()).status, 'paid')
  assert.equal(state.sales.size, 1)
  const file = await download.GET(new Request(downloadUrl), { params: Promise.resolve({ id: 'listing1' }) })
  assert.equal(file.status, 200)
  assert.equal(await file.text(), 'example file contents')
  assert.equal(file.headers.get('X-Downloads-Remaining'), '0')
  assert.equal((await download.GET(new Request(downloadUrl), { params: Promise.resolve({ id: 'listing1' }) })).status, 410)
  assert.equal((await webhook.POST(eventRequest('checkout.session.completed', state.session))).status, 200)
  assert.equal((await webhook.POST(eventRequest('checkout.session.async_payment_succeeded', state.session))).status, 200)
  assert.equal(state.sales.size, 1)
})

test('Webhook rejects missing or bad signatures and ignores unrelated transactions', async () => {
  const { state, webhook, dependencies } = await setup()
  const noSignature = new Request('https://example.test/api/stripe/webhook', { method: 'POST', body: '{}' })
  assert.equal((await webhook.POST(noSignature)).status, 400)
  assert.equal((await webhook.POST(eventRequest('checkout.session.completed', state.session, 'v1=invalid'))).status, 400)
  assert.equal((await webhook.POST(eventRequest('payment_intent.succeeded', state.session))).status, 200)
  assert.equal(state.sales.size, 0)
  const unavailable = await loadRoute('app/api/stripe/webhook/route.js', dependencies, {})
  assert.equal((await unavailable.POST(eventRequest('checkout.session.completed', state.session))).status, 503)
})

test('Checkout refuses missing recipient and sold-out listing; paid session cannot download another listing', async () => {
  const { state, checkout, download } = await setup()
  state.transfersEnabled = false
  assert.equal((await checkout.POST(new Request('https://example.test/api/checkout/listing1', { method: 'POST' }),
    { params: Promise.resolve({ id: 'listing1' }) })).status, 409)
  state.transfersEnabled = true
  await checkout.POST(new Request('https://example.test/api/checkout/listing1', { method: 'POST' }),
    { params: Promise.resolve({ id: 'listing1' }) })
  state.sales.add('listing1/cs_test_contract_1')
  assert.equal((await checkout.POST(new Request('https://example.test/api/checkout/listing1', { method: 'POST' }),
    { params: Promise.resolve({ id: 'listing1' }) })).status, 410)
  state.session.payment_status = 'paid'
  assert.equal((await download.GET(new Request('https://example.test/api/download/other-listing?session_id=cs_test_contract_1'),
    { params: Promise.resolve({ id: 'other-listing' }) })).status, 403)
})
