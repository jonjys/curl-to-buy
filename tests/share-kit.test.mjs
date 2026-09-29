import test from 'node:test'
import assert from 'node:assert/strict'
import QRCode from 'qrcode'
import { buyButtonHtml, checkoutUrl, qrFileName, shortUrl } from '../lib/share-kit.js'

test('checkout URL is the public /dl/[id] link on the same origin', () => {
  assert.equal(checkoutUrl('https://curltobuy.com', 'abc_123-X'), 'https://curltobuy.com/dl/abc_123-X')
  assert.equal(checkoutUrl('https://curltobuy.com/some/path?q=1', 'abc'), 'https://curltobuy.com/dl/abc')
  assert.equal(checkoutUrl('http://localhost:3000', 'abc'), 'http://localhost:3000/dl/abc')
  assert.throws(() => checkoutUrl('http://curltobuy.com', 'abc'))
  assert.throws(() => checkoutUrl('https://curltobuy.com', '../orders/abc'))
  assert.throws(() => checkoutUrl('https://curltobuy.com', 'a b'))
  assert.throws(() => checkoutUrl('https://curltobuy.com', ''))
  assert.equal(shortUrl('https://curltobuy.com/dl/abc'), 'curltobuy.com/dl/abc')
})

test('buy button HTML is a plain link to the checkout with escaped text and no script', () => {
  const url = 'https://curltobuy.com/dl/abc'
  const html = buyButtonHtml({ url, label: 'Buy <now> & "save" \'x\'' })
  assert.match(html, /^<a href="https:\/\/curltobuy\.com\/dl\/abc" style="[^"<>]*">[^<>]*<\/a>$/)
  assert.ok(html.includes('Buy &lt;now&gt; &amp; &quot;save&quot; &#39;x&#39;'))
  assert.equal(/<script|<iframe|javascript:|on\w+=/i.test(html), false)
  assert.throws(() => buyButtonHtml({ url: 'javascript:alert(1)', label: 'x' }))
  assert.throws(() => buyButtonHtml({ url: 'https://curltobuy.com/orders/abc', label: 'x' }))
  assert.throws(() => buyButtonHtml({ url: 'https://curltobuy.com/dl/abc?x="><script>', label: 'x' }))
  assert.throws(() => buyButtonHtml({ url: 'http://curltobuy.com/dl/abc', label: 'x' }))
})

test('QR file name carries the product name and the QR payload is exactly the checkout URL', () => {
  assert.equal(qrFileName('Sommar Lampa: Mässing!', 'png'), 'nytto-checkout-sommar-lampa-massing-qr.png')
  assert.equal(qrFileName('', 'svg'), 'nytto-checkout-product-qr.svg')
  assert.equal(qrFileName('../../etc', 'exe'), 'nytto-checkout-etc-qr.png')
  const url = checkoutUrl('https://curltobuy.com', 'abc')
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' })
  assert.equal(qr.segments.map((segment) => Buffer.from(segment.data).toString('utf8')).join(''), url)
})
