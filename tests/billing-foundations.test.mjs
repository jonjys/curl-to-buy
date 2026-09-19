import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime, catalog } from './integration-helper.mjs'

test('billing requires Stripe, connected-event delivery and the scoped customer portal', async () => {
  for (const [env, expected] of [
    [{},false],
    [{ STRIPE_CTB_CONNECT_WEBHOOK_SECRET: 'whsec_mock' },false],
    [{ STRIPE_CTB_CONNECT_WEBHOOK_SECRET: 'whsec_mock', STRIPE_CTB_PORTAL_CONFIGURATION: 'bpc_mock' },true],
  ]) {
    const billing = await runtime({ env }).load('lib/billing.js')
    assert.equal(billing.billingEnabled(), expected)
  }
})
test('price catalog validates monthly EUR amounts, product ownership, tax behavior and quotas', async () => {
  const prices = catalog()
  const billing = await runtime().load('lib/billing.js')
  const client = { prices: { list: async () => ({ data: prices }) } }
  const plans = await billing.getPlans(client)
  assert.deepEqual(JSON.parse(JSON.stringify(plans.map(({ key, amount, monthlyLinks }) => [key,amount,monthlyLinks]))),
    [['start',500,10],['grow',1900,50],['scale',4900,null]])
  prices[0].product.metadata.app = 'another_app'
  await assert.rejects(() => billing.getPlans(client), /not configured/)
  prices[0].product.metadata.app = 'curl_to_buy'
  prices[0].product.metadata.monthly_links = '-1'
  await assert.rejects(() => billing.getPlans(client), /link limit/)
})
test('paid entitlement uses Stripe period and seller identity; overdue subscriptions cannot open a second subscription', async () => {
  const now = Math.floor(Date.now()/1000)
  const sub = { id: 'sub_1', status:'active', metadata: { seller_id:'seller1' }, cancel_at_period_end:true,
    items: { data:[{ quantity:1, price:{ id:'price_start' }, current_period_start:now-100, current_period_end:now+1000 }] } }
  const client = { subscriptions:{ list:async () => ({ data:[sub] }) }, prices:{ list:async () => ({ data:catalog() }) } }
  const billing = await runtime({ client }).load('lib/billing.js')
  const seller = { id:'seller1', billingIdentity:{ customer_account:'acct_1' } }
  assert.equal((await billing.billingState(seller)).active,true)
  sub.status='past_due'
  assert.equal((await billing.billingState(seller)).active,false)
  assert.equal((await billing.billingState(seller)).subscriptionId,'sub_1')
  sub.status='active';sub.items.data[0].current_period_end=now-1
  assert.equal((await billing.billingState(seller)).active,false)
  sub.metadata.seller_id='another_seller'
  assert.equal((await billing.billingState(seller)).subscriptionId,undefined)
})
test('no subscription charge when the deployment is not configured', async () => {
  const app = runtime()
  const route = await app.load('app/api/billing/checkout/route.js')
  const response = await route.POST(new Request('https://app.test/api/billing/checkout',{ method:'POST', body:'{"plan":"start"}' }))
  assert.equal(response.status,503)
})
test('fee payer must be Stripe and cards must be active before selling on subscription', async () => {
  const connect = await runtime().load('lib/stripe-connect.js')
  const account={ defaults:{ responsibilities:{ fees_collector:'application', losses_collector:'application' } },
    configuration:{ merchant:{ capabilities:{ card_payments:{ status:'active' } } } } }
  assert.equal(connect.merchantStatus(account).ready,false)
  account.defaults.responsibilities={ fees_collector:'stripe', losses_collector:'stripe' }
  assert.equal(connect.merchantStatus(account).ready,true)
  account.configuration.merchant.capabilities.card_payments.status='pending'
  assert.equal(connect.merchantStatus(account).ready,false)
})
