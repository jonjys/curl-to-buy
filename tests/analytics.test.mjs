import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime } from './integration-helper.mjs'
import { EVENTS, campaignSource, safeProps, scrubUrl } from '../lib/analytics.js'

test('only allowlisted, harmless event properties are sent', () => {
  assert.deepEqual(safeProps({
    source: 'Instagram', location: 'hero', item_type: 'physical', currency: 'SEK', plan: 'grow',
    email: 'a@b.c', name: 'Lamp', product: 'Lamp', url: 'https://pay.nyttolabs.com/dl/abc', sellerId: 's1', sessionId: 'cs_1', path: 'listing-images/x',
  }), { source: 'instagram', location: 'hero', item_type: 'physical', currency: 'sek', plan: 'grow' })
  assert.deepEqual(safeProps({ source: 'facebook', currency: 'btc', item_type: 'car', location: '<script>' }), {})
  assert.equal(campaignSource('TikTok'), 'tiktok')
  assert.equal(campaignSource('whatsapp'), null)
  assert.equal(campaignSource('../x'), null)
  assert.equal(EVENTS.length, 9)
})

test('page URLs lose product IDs, order IDs and every non-UTM query parameter', () => {
  assert.equal(scrubUrl('https://pay.nyttolabs.com/dl/abc123?x=1'), 'https://pay.nyttolabs.com/dl/[id]')
  assert.equal(scrubUrl('https://pay.nyttolabs.com/dl/abc123/image'), 'https://pay.nyttolabs.com/dl/[id]/image')
  assert.equal(scrubUrl('https://pay.nyttolabs.com/orders/abc123?t=secret'), 'https://pay.nyttolabs.com/orders/[id]')
  assert.equal(scrubUrl('https://pay.nyttolabs.com/success?session_id=cs_live_123&listing_id=abc'), 'https://pay.nyttolabs.com/success')
  assert.equal(scrubUrl('https://pay.nyttolabs.com/links?cursor=xyz'), 'https://pay.nyttolabs.com/links')
  assert.equal(
    scrubUrl('https://pay.nyttolabs.com/instagram?utm_source=instagram&utm_medium=social&utm_campaign=launch&utm_content=story-1&email=a@b.c'),
    'https://pay.nyttolabs.com/instagram?utm_source=instagram&utm_medium=social&utm_campaign=launch&utm_content=story-1',
  )
  assert.equal(scrubUrl('https://pay.nyttolabs.com/?utm_source=%3Cscript%3E'), 'https://pay.nyttolabs.com/')
})

test('purchase_completed is sent once per paid session, only in production, without IDs', async () => {
  const sent = []
  const send = async (name, props, options) => { sent.push({ name, props, options }) }
  const prod = await runtime({ env: { VERCEL_ENV: 'production' } }).load('lib/analytics-server.js')
  for (let i = 0; i < 3; i++) await prod.trackPurchaseCompleted({ sessionId: 'cs_test_1', itemType: 'physical', currency: 'sek' }, { send })
  await prod.trackPurchaseCompleted({ sessionId: 'cs_test_2', itemType: 'digital', currency: 'usd' }, { send })
  await prod.trackPurchaseCompleted({ sessionId: '../escape', itemType: 'digital', currency: 'usd' }, { send })
  assert.deepEqual(JSON.parse(JSON.stringify(sent.map((event) => [event.name, event.props]))), [
    ['purchase_completed', { item_type: 'physical', currency: 'sek' }],
    ['purchase_completed', { item_type: 'digital', currency: 'usd' }],
  ])
  assert.equal(JSON.stringify(sent).includes('cs_test'), false)

  const failing = await runtime({ env: { VERCEL_ENV: 'production' } }).load('lib/analytics-server.js')
  assert.equal(await failing.trackPurchaseCompleted({ sessionId: 'cs_test_3', itemType: 'digital', currency: 'usd' }, { send: async () => { throw Error('down') } }), false)

  const preview = await runtime({ env: { VERCEL_ENV: 'preview' } }).load('lib/analytics-server.js')
  assert.equal(await preview.trackPurchaseCompleted({ sessionId: 'cs_test_4', itemType: 'digital', currency: 'usd' }, { send }), false)
  assert.equal(sent.length, 2)
})
