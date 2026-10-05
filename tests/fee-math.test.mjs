import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PLAN_EUR, breakEven, formatMoney, saleSplit } from '../lib/fee-math.js'
import { FREE_FEE_BPS, SUB_FEE_BPS } from '../lib/entitlement.js'

test('calculator splits a sale exactly like the platform fee', () => {
  assert.deepEqual(saleSplit(19, FREE_FEE_BPS), { price: 19, fee: 0.95, keep: 18.05 })
  assert.deepEqual(saleSplit('300', FREE_FEE_BPS), { price: 300, fee: 15, keep: 285 })
  assert.deepEqual(saleSplit(19, SUB_FEE_BPS), { price: 19, fee: 0, keep: 19 })
  for (const bad of ['', 'abc', -5, 0, null]) assert.deepEqual(saleSplit(bad, FREE_FEE_BPS), { price: 0, fee: 0, keep: 0 })
})

test('break-even is where the flat plan equals the percentage fee', () => {
  assert.equal(breakEven(PLAN_EUR.start, FREE_FEE_BPS), 100)
  assert.equal(breakEven(PLAN_EUR.grow, FREE_FEE_BPS), 380)
  assert.equal(breakEven(5, 0), null)
})

test('landing plan prices match the verified Stripe plans', async () => {
  const billing = await readFile(new URL('../lib/billing.js', import.meta.url), 'utf8')
  for (const [key, eur] of Object.entries(PLAN_EUR)) {
    const match = billing.match(new RegExp(`${key}: \\{[^}]*amount: (\\d+)`))
    assert.ok(match, `plan ${key} missing in lib/billing.js`)
    assert.equal(Number(match[1]), eur * 100, `plan ${key}`)
  }
})

test('money formatting per locale and currency', () => {
  assert.equal(formatMoney(18.05, 'usd', 'en'), '$18.05')
  assert.equal(formatMoney(285, 'sek', 'sv'), '285 kr')
  assert.equal(formatMoney(5, 'eur', 'sv'), '5 €')
  assert.equal(formatMoney(5, 'eur', 'en'), '€5')
})
