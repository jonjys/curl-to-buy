import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime, catalog } from './integration-helper.mjs'

test('billing is available when a Stripe key is present', async () => {
  const disabled = await runtime({ env: { STRIPE_SECRET_KEY: '' } }).load('lib/billing.js')
  assert.equal(disabled.billingEnabled(), false)
  const enabled = await runtime().load('lib/billing.js')
  assert.equal(enabled.billingEnabled(), true)
})

test('price catalog validates monthly EUR amounts, product ownership, tax behavior and quotas', async () => {
  const prices = catalog()
  const billing = await runtime().load('lib/billing.js')
  const client = { prices: { list: async () => ({ data: prices }) } }
  const plans = await billing.getPlans(client)
  assert.deepEqual(JSON.parse(JSON.stringify(plans.map(({ key, amount, monthlyLinks }) => [key, amount, monthlyLinks]))),
    [['start', 500, 10], ['grow', 1900, 50], ['scale', 4900, null]])
  prices[0].product.metadata.app = 'another_app'
  await assert.rejects(() => billing.getPlans(client), /not configured/)
  prices[0].product.metadata.app = 'curl_to_buy'
  prices[0].product.metadata.monthly_links = '-1'
  await assert.rejects(() => billing.getPlans(client), /link limit/)
})

test('catalog prefers verified live Price IDs and falls back to the known Start/Grow/Scale list', async () => {
  const billing = await runtime().load('lib/billing.js')
  const verified = catalog().map((price, index) => ({
    ...price,
    id: Object.values(billing.VERIFIED_PLANS)[index].priceId,
    lookup_key: Object.values(billing.VERIFIED_PLANS)[index].lookup,
  }))
  const client = {
    prices: {
      retrieve: async (id) => {
        const price = verified.find((item) => item.id === id)
        if (!price) throw Error('missing')
        return price
      },
      list: async () => { throw Error('list should not run when retrieve succeeds') },
    },
  }
  const plans = await billing.getPlans(client)
  assert.equal(JSON.stringify(plans.map((plan) => [plan.key, plan.priceId, plan.amount])),
    JSON.stringify([
      ['start', billing.VERIFIED_PLANS.start.priceId, 500],
      ['grow', billing.VERIFIED_PLANS.grow.priceId, 1900],
      ['scale', billing.VERIFIED_PLANS.scale.priceId, 4900],
    ]))
  assert.equal(JSON.stringify(billing.displayPlans().map((plan) => [plan.key, plan.amount, plan.monthlyLinks])),
    JSON.stringify([['start', 500, 10], ['grow', 1900, 50], ['scale', 4900, null]]))
})

test('paid entitlement uses Stripe period and seller identity; overdue subscriptions cannot open a second subscription', async () => {
  const now = Math.floor(Date.now() / 1000)
  const sub = {
    id: 'sub_1', status: 'active', metadata: { seller_id: 'seller1' }, cancel_at_period_end: true,
    items: { data: [{ quantity: 1, price: { id: 'price_start' }, current_period_start: now - 100, current_period_end: now + 1000 }] },
  }
  const client = { subscriptions: { list: async () => ({ data: [sub] }) }, prices: { list: async () => ({ data: catalog() }) } }
  const billing = await runtime({ client }).load('lib/billing.js')
  const seller = { id: 'seller1', billingIdentity: { customer_account: 'acct_1' } }
  assert.equal((await billing.billingState(seller)).active, true)
  sub.status = 'past_due'
  assert.equal((await billing.billingState(seller)).active, false)
  assert.equal((await billing.billingState(seller)).subscriptionId, 'sub_1')
  sub.status = 'active'; sub.items.data[0].current_period_end = now - 1
  assert.equal((await billing.billingState(seller)).active, false)
  sub.metadata.seller_id = 'another_seller'
  assert.equal((await billing.billingState(seller)).subscriptionId, undefined)
})

test('plans route still shows Start, Grow and Scale when Stripe catalog cannot be read', async () => {
  const app = runtime({
    client: {
      prices: {
        retrieve: async () => { throw Error('catalog missing') },
        list: async () => { throw Error('catalog missing') },
      },
    },
  })
  const route = await app.load('app/api/billing/plans/route.js')
  const response = await route.GET()
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.source, 'verified_fallback')
  assert.equal(body.acceptingSubscriptions, false)
  assert.deepEqual(body.plans.map((plan) => [plan.key, plan.amount, plan.monthlyLinks]), [
    ['start', 500, 10],
    ['grow', 1900, 50],
    ['scale', 4900, null],
  ])
})

test('no subscription charge when Stripe is not configured', async () => {
  const app = runtime({ env: { STRIPE_SECRET_KEY: '' } })
  const route = await app.load('app/api/billing/checkout/route.js')
  const response = await route.POST(new Request('https://app.test/api/billing/checkout', { method: 'POST', body: '{"plan":"start"}' }))
  assert.equal(response.status, 503)
})

test('verified live Price IDs unlock checkout even when product metadata is incomplete', async () => {
  const billing = await runtime().load('lib/billing.js')
  const client = {
    prices: {
      retrieve: async (id) => {
        const spec = Object.values(billing.VERIFIED_PLANS).find((item) => item.priceId === id)
        if (!spec) throw Error('missing')
        return {
          id: spec.priceId, lookup_key: spec.lookup, currency: 'eur', unit_amount: spec.amount,
          recurring: { interval: 'month', interval_count: 1 }, product: spec.priceId,
        }
      },
      list: async () => { throw Error('list should not run when retrieve matches verified IDs') },
    },
  }
  const plans = await billing.getPlans(client)
  assert.equal(JSON.stringify(plans.map((plan) => [plan.key, plan.priceId, plan.amount, plan.monthlyLinks])),
    JSON.stringify([
      ['start', billing.VERIFIED_PLANS.start.priceId, 500, 10],
      ['grow', billing.VERIFIED_PLANS.grow.priceId, 1900, 50],
      ['scale', billing.VERIFIED_PLANS.scale.priceId, 4900, null],
    ]))
})

test('account links request every configuration on the connected account', async () => {
  const connect = await runtime().load('lib/stripe-connect.js')
  assert.equal(JSON.stringify(connect.accountLinkConfigurations({
    configuration: { merchant: {}, customer: {} },
  })), '["customer","merchant"]')
  assert.equal(JSON.stringify(connect.accountLinkConfigurations({
    configuration: { merchant: {}, recipient: {} },
  })), '["merchant","recipient"]')
  assert.equal(JSON.stringify(connect.accountLinkConfigurations({})), '["customer","merchant"]')
  assert.equal(JSON.stringify(connect.accountLinkConfigurations({
    configuration: { merchant: {}, customer: {}, storer: { capabilities: {} } },
  })), '["customer","merchant","storer"]')
})

test('merchant account creation configs match account_links or Stripe rejects the mismatch', async () => {
  const calls = []
  const created = {
    id: 'acct_match',
    configuration: {
      merchant: { capabilities: { card_payments: { requested: true } } },
      customer: { capabilities: { automatic_indirect_tax: { requested: true } } },
    },
  }
  const app = runtime({
    fetch: async (url, options = {}) => {
      const path = String(url).replace('https://api.stripe.com', '')
      const body = options.body ? JSON.parse(options.body) : null
      calls.push({ path, method: options.method || 'GET', body })
      if (path === '/v2/core/accounts' && options.method === 'POST') {
        return new Response(JSON.stringify(created), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (path.startsWith('/v2/core/accounts/acct_match')) {
        return new Response(JSON.stringify(created), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (path === '/v2/core/account_links') {
        const configurations = body?.use_case?.account_onboarding?.configurations || []
        const expected = ['customer', 'merchant']
        const match = configurations.length === expected.length && expected.every((key) => configurations.includes(key))
        if (!match) {
          return new Response(JSON.stringify({
            error: { code: 'configs_must_match_to_use_account_links', message: 'The configurations in the request must match those on the account.' },
          }), { status: 400, headers: { 'Content-Type': 'application/json' } })
        }
        return new Response(JSON.stringify({
          url: 'https://connect.stripe.com/setup/s/acct_match/ok',
          use_case: { account_onboarding: { configurations } },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ error: { message: `unexpected ${path}` } }), { status: 500 })
    },
  })
  const connect = await app.load('lib/stripe-connect.js')
  const body = connect.merchantAccountBody({ email: 'seller@example.test', sellerId: 'seller1' })
  assert.deepEqual(connect.accountLinkConfigurations({ configuration: body.configuration }), connect.MERCHANT_CONFIGURATIONS)
  assert.equal(connect.accountLinkConfigurations({ configuration: body.configuration }).includes('customer'), true)
  const account = await connect.createSubscriptionMerchant({ email: 'seller@example.test', sellerId: 'seller1' })
  const link = await connect.merchantOnboardingLink(account.id, 'https://pay.nyttolabs.com', account)
  assert.equal(link.url, 'https://connect.stripe.com/setup/s/acct_match/ok')
  assert.equal(link.source, 'v2')
  const linkCall = calls.find((call) => call.path === '/v2/core/account_links')
  assert.equal(JSON.stringify([...linkCall.body.use_case.account_onboarding.configurations].sort()), '["customer","merchant"]')
  assert.equal(JSON.stringify(Object.keys(calls.find((call) => call.path === '/v2/core/accounts').body.configuration).sort()), '["customer","merchant"]')
})

test('fee payer must be Stripe and cards must be active before selling on subscription', async () => {
  const connect = await runtime().load('lib/stripe-connect.js')
  const account = {
    defaults: { responsibilities: { fees_collector: 'application', losses_collector: 'application' } },
    configuration: { merchant: { capabilities: { card_payments: { status: 'active' } } } },
  }
  assert.equal(connect.merchantStatus(account).ready, false)
  account.defaults.responsibilities = { fees_collector: 'stripe', losses_collector: 'stripe' }
  assert.equal(connect.merchantStatus(account).ready, true)
  account.configuration.merchant.capabilities.card_payments.status = 'pending'
  assert.equal(connect.merchantStatus(account).ready, false)
})
