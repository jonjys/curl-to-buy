import test from 'node:test'
import assert from 'node:assert/strict'
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
  assert.equal(EVENTS.length, 8)
  assert.equal(EVENTS.includes('purchase_completed'), false)
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
