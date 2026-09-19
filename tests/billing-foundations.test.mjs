import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

async function loadModule(path, env = {}, dependencies = {}) {
  const context = vm.createContext({ process: { env }, console, Request, Response, URL, Date, Math })
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8')
  const module = new vm.SourceTextModule(source, { context, identifier: path })
  await module.link((specifier) => {
    const exports = dependencies[specifier]
    assert.ok(exports, `Unexpected import ${specifier}`)
    return new vm.SyntheticModule(Object.keys(exports), function initialize() {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value)
    }, { context })
  })
  await module.evaluate()
  return module.namespace
}

function price(key, amount, limit) {
  return {
    id: `price_${key}`, lookup_key: `ctb_${key}_monthly_v1`, currency: 'eur',
    unit_amount: amount, recurring: { interval: 'month', interval_count: 1 },
    metadata: { app: 'curl_to_buy', plan: key },
    product: { name: `Curl-to-Buy ${key}`, metadata: {
      app: 'curl_to_buy', plan: key, monthly_links: limit,
    } },
  }
}

test('subscriptions cannot charge in live mode even when someone sets sandbox flags', async () => {
  const live = await loadModule('lib/billing.js', {
    STRIPE_SECRET_KEY: 'sk_live_fake', CTB_BILLING_SANDBOX_ENABLED: 'true', CTB_BILLING_STORAGE_ISOLATED: 'true',
  })
  assert.equal(live.billingSandboxEnabled(), false)
  const sharedStorage = await loadModule('lib/billing.js', {
    STRIPE_SECRET_KEY: 'sk_test_fake', CTB_BILLING_SANDBOX_ENABLED: 'true', CTB_BILLING_STORAGE_ISOLATED: 'false',
  })
  assert.equal(sharedStorage.billingSandboxEnabled(), false)
  const sandbox = await loadModule('lib/billing.js', {
    STRIPE_SECRET_KEY: 'sk_test_fake', CTB_BILLING_SANDBOX_ENABLED: 'true', CTB_BILLING_STORAGE_ISOLATED: 'true',
  })
  assert.equal(sandbox.billingSandboxEnabled(), true)
})

test('plan prices and quotas must match Stripe metadata; reject partial or inconsistent catalog', async () => {
  const billing = await loadModule('lib/billing.js')
  const catalog = [price('start', 500, '10'), price('grow', 1900, '50'), price('scale', 4900, 'unlimited')]
  const client = { prices: { list: async () => ({ data: catalog }) } }
  const plans = await billing.getPlans(client)
  assert.deepEqual(Array.from(plans.map(({ key, amount, monthlyLinks }) => [key, amount, monthlyLinks])), [
    ['start', 500, 10], ['grow', 1900, 50], ['scale', 4900, null],
  ])
  const changed = structuredClone(catalog)
  changed[0].product.metadata.plan = 'other-product'
  await assert.rejects(() => billing.getPlans({ prices: { list: async () => ({ data: changed }) } }), /not configured correctly/)
  await assert.rejects(() => billing.getPlans({ prices: { list: async () => ({ data: catalog.slice(0, 2) }) } }), /not configured correctly/)
})

test('live billing checkout fails closed before reading seller data or taking a payment', async () => {
  let called = false
  const route = await loadModule('app/api/billing/checkout/route.js', {}, {
    '../../../../lib/stripe': { stripe: () => { called = true; throw Error('Not allowed') } },
    '../../../../lib/billing': { billingSandboxEnabled: () => false, getPlans: () => { called = true }, getCurrentSubscription: () => { called = true } },
    '../../../../lib/store': { getSeller: () => { called = true }, updateSeller: () => { called = true } },
    '../../../../lib/seller': { sellerIdFromRequest: () => { called = true } },
    '../../../../lib/site': { originFrom: () => { called = true } },
  })
  const response = await route.POST(new Request('https://example.test/api/billing/checkout', { method: 'POST', body: JSON.stringify({ plan: 'start' }) }))
  assert.equal(response.status, 503)
  assert.equal(called, false)
})
