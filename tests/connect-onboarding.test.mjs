import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime, catalog } from './integration-helper.mjs'

const MERCHANT = {
  id: 'acct_merchant',
  email: 'seller@example.test',
  charges_enabled: false,
  metadata: { curl_to_buy_seller_id: 'seller1' },
  configuration: {
    merchant: { capabilities: { card_payments: { requested: true, status: 'pending' } } },
    customer: { capabilities: { automatic_indirect_tax: { requested: true } } },
  },
  defaults: { responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
}

function stripeFetch(calls, { express = false } = {}) {
  return async (url, options = {}) => {
    const parsed = new URL(String(url))
    const path = parsed.pathname
    const body = options.body ? JSON.parse(options.body) : null
    calls.push({ path, method: options.method || 'GET', body })
    if (path === '/v2/core/accounts' && options.method === 'POST') {
      return json(MERCHANT)
    }
    if (path.startsWith('/v2/core/accounts/acct_express')) {
      return json({
        id: 'acct_express',
        email: 'seller@example.test',
        charges_enabled: true,
        metadata: { curl_to_buy_seller_id: 'seller1' },
        controller: { fees: { payer: 'application' }, losses: { payments: 'application' } },
      })
    }
    if (path.startsWith('/v2/core/accounts/acct_merchant')) return json(express ? { ...MERCHANT, charges_enabled: false } : MERCHANT)
    if (path === '/v2/core/account_links') {
      const onboarding = body?.use_case?.account_onboarding || {}
      const configurations = onboarding.configurations || []
      const https = String(onboarding.return_url).startsWith('https://') && String(onboarding.refresh_url).startsWith('https://')
      const configs = configurations.length === 2 && configurations.includes('customer') && configurations.includes('merchant')
      if (body?.account !== 'acct_merchant' || !https || !configs) {
        return json({ error: { code: 'configs_must_match_to_use_account_links', message: 'The configurations in the request must match those on the account.' } }, 400)
      }
      return json({ url: 'https://connect.stripe.com/setup/s/acct_merchant/ok' })
    }
    return json({ error: { message: `unexpected ${path}` } }, 500)
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function connectRequest(path, { cookie, body, proto = 'http' } = {}) {
  return new Request(`https://pay.nyttolabs.com${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      host: 'pay.nyttolabs.com',
      'x-forwarded-proto': proto,
      origin: 'https://pay.nyttolabs.com',
      ...(cookie ? { cookie } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}

test('account links use https return and refresh urls on the live host', async () => {
  const calls = []
  const app = runtime({ fetch: stripeFetch(calls) })
  const connect = await app.load('lib/stripe-connect.js')
  const site = await app.load('lib/site.js')
  const urls = connect.onboardingUrls('http://pay.nyttolabs.com', 'sell')
  assert.equal(urls.returnUrl, 'https://pay.nyttolabs.com/?stripe=return')
  assert.equal(urls.refreshUrl, 'https://pay.nyttolabs.com/api/connect/refresh')
  const link = await connect.merchantOnboardingLink('acct_merchant', 'http://pay.nyttolabs.com', MERCHANT, 'sell')
  assert.equal(link.url, 'https://connect.stripe.com/setup/s/acct_merchant/ok')
  const posted = calls.find((call) => call.path === '/v2/core/account_links')
  assert.equal(posted.body.use_case.account_onboarding.return_url, 'https://pay.nyttolabs.com/?stripe=return')
  assert.equal(posted.body.use_case.account_onboarding.refresh_url, 'https://pay.nyttolabs.com/api/connect/refresh')
  assert.equal(site.onboardingNotice('return', { hasSeller: true, ready: false }), 'incomplete')
  assert.equal(site.onboardingNotice('refresh', { hasSeller: true, ready: false }), 'expired')
  assert.equal(site.onboardingNotice('return', { hasSeller: true, ready: true }), 'ready')
})

test('public blob storage does not create a connected account', async () => {
  const calls = []
  const app = runtime({
    fetch: stripeFetch(calls),
    blob: {
      ...runtime().blob,
      async put() {
        throw Error('Vercel Blob: Cannot use private access on a public store. The store must be configured with private access.')
      },
    },
  })
  const route = await app.load('app/api/connect/route.js')
  const response = await route.POST(connectRequest('/api/connect', { body: { email: 'seller@example.test' } }))
  assert.equal(response.status, 503)
  const body = await response.json()
  assert.match(body.error, /private Blob access/)
  assert.equal(/Vercel Blob|at \//.test(body.error), false)
  assert.equal(calls.length, 0)
})

test('an express account that cannot take direct charges gets a new onboarding link', async () => {
  const calls = []
  const app = runtime({ fetch: stripeFetch(calls, { express: true }) })
  const store = await app.load('lib/store.js')
  const seller = {
    id: 'seller1', email: 'seller@example.test', stripeAccountId: 'acct_express',
    paymentAccountId: 'acct_express', feeBps: 500,
  }
  await store.saveSeller(seller)
  const cookie = (await app.load('lib/seller.js')).sellerCookie(seller.id).split(';')[0]
  const route = await app.load('app/api/connect/route.js')
  const response = await route.POST(connectRequest('/api/connect', { cookie, body: { returnTo: 'sell' } }))
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.url, 'https://connect.stripe.com/setup/s/acct_merchant/ok')
  const saved = await store.getSeller('seller1')
  assert.equal(saved.paymentAccountId, 'acct_merchant')
  assert.equal(saved.stripeAccountId, 'acct_express')
  const link = calls.find((call) => call.path === '/v2/core/account_links')
  assert.equal(link.body.account, 'acct_merchant')
  assert.equal(link.body.use_case.account_onboarding.return_url, 'https://pay.nyttolabs.com/?stripe=return')
  assert.equal(link.body.use_case.account_onboarding.refresh_url, 'https://pay.nyttolabs.com/api/connect/refresh')
})

test('expired onboarding link refreshes to a new Stripe url and incomplete return stays on site', async () => {
  const calls = []
  const app = runtime({ fetch: stripeFetch(calls) })
  const store = await app.load('lib/store.js')
  await store.saveSeller({
    id: 'seller1', email: 'seller@example.test', stripeAccountId: 'acct_merchant',
    paymentAccountId: 'acct_merchant', feeBps: 500, onboardingReturn: 'sell',
  })
  const cookie = (await app.load('lib/seller.js')).sellerCookie('seller1').split(';')[0]
  const refresh = await app.load('app/api/connect/refresh/route.js')
  const response = await refresh.GET(connectRequest('/api/connect/refresh', { cookie }))
  assert.equal(response.status, 303)
  assert.equal(response.headers.get('location'), 'https://connect.stripe.com/setup/s/acct_merchant/ok')
  assert.equal(calls.some((call) => call.path === '/v2/core/accounts' && call.method === 'POST'), false)

  const missing = await refresh.GET(connectRequest('/api/connect/refresh'))
  assert.equal(missing.status, 303)
  assert.equal(missing.headers.get('location'), 'https://pay.nyttolabs.com/?stripe=refresh')
})

test('connected seller checkout session is a direct charge with a 5 percent fee', async () => {
  const seller = {
    id: 'seller1', email: 'seller@example.test', paymentAccountId: 'acct_merchant',
    billingIdentity: { customer_account: 'acct_merchant' }, feeBps: 500,
  }
  const creates = []
  const app = runtime({
    client: {
      prices: { list: async () => ({ data: catalog() }) },
      subscriptions: { list: async () => ({ data: [] }) },
      checkout: { sessions: { create: async (args, opts = {}) => {
        creates.push({ args, opts })
        return { id: 'cs_test_connected', url: 'https://checkout.stripe.com/c/pay/cs_test_connected', metadata: args.metadata }
      } } },
    },
    mocks: {
      'lib/stripe-connect.js': {
        loadReadySeller: async () => seller,
        readySubscriptionMerchant: async () => ({ id: 'acct_merchant' }),
        retrieveConnectedRecipient: async () => ({}),
        recipientStatus: () => ({ transfers: false }),
      },
    },
  })
  const store = await app.load('lib/store.js')
  await store.saveSeller(seller)
  await store.saveListing({
    id: 'listing1', name: 'Notes', sellerId: seller.id, billingMode: 'freemium', feeBps: 500,
    paymentAccountId: 'acct_merchant', currency: 'usd', priceUsd: 10, priceCents: 1000,
    files: [{ name: 'notes.txt', blobPathname: 'uploads/notes.txt', size: 12, type: 'text/plain' }],
  })
  const checkout = await app.load('app/api/checkout/[id]/route.js')
  const response = await checkout.POST(new Request('https://pay.nyttolabs.com/api/checkout/listing1', {
    method: 'POST',
    headers: { host: 'pay.nyttolabs.com', 'x-forwarded-proto': 'http', 'Content-Type': 'application/json' },
    body: '{}',
  }), { params: { id: 'listing1' } })
  assert.equal(response.status, 200)
  assert.equal((await response.json()).url, 'https://checkout.stripe.com/c/pay/cs_test_connected')
  assert.equal(creates[0].opts.stripeAccount, 'acct_merchant')
  assert.equal(creates[0].args.payment_intent_data.application_fee_amount, 50)
  assert.equal(creates[0].args.payment_intent_data.transfer_data, undefined)
  assert.equal(creates[0].args.success_url, 'https://pay.nyttolabs.com/success?listing_id=listing1&session_id={CHECKOUT_SESSION_ID}')
  assert.equal(creates[0].args.cancel_url, 'https://pay.nyttolabs.com/dl/listing1')
})
