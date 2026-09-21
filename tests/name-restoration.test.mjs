import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime } from './integration-helper.mjs'

test('canonical site recovers from a stale GetPaidLink environment setting', async () => {
  for (const value of [undefined, 'https://getpaidlink.nyttolabs.com', 'https://getpaidlink.nyttolabs.com/']) {
    const { SITE } = await runtime({ env: { NEXT_PUBLIC_SITE_URL: value } }).load('lib/site.js')
    assert.equal(SITE, 'https://pay.nyttolabs.com')
  }
})

test('return URLs restore pay while keeping preview origins isolated', async () => {
  const { originFrom } = await runtime().load('lib/site.js')
  for (const [host, expected] of [
    ['pay.nyttolabs.com', 'https://pay.nyttolabs.com'],
    ['getpaidlink.nyttolabs.com', 'https://pay.nyttolabs.com'],
    ['preview.vercel.app', 'https://preview.vercel.app'],
  ]) {
    assert.equal(originFrom(new Request(`https://${host}/api/connect`, { headers: { host } })), expected)
  }
})

test('no host redirects remain; APIs preserve the preview isolation gate', async () => {
  const mocks = { 'next/server': { NextResponse: {
    next: () => new Response(null, { status: 200 }),
    json: (body, options) => Response.json(body, options),
  } } }
  for (const [environment, apiStatus] of [['production', 200], ['preview', 503]]) {
    const { middleware } = await runtime({ env: { VERCEL_ENV: environment }, mocks }).load('middleware.js')
    for (const host of ['pay.nyttolabs.com', 'getpaidlink.nyttolabs.com']) {
      for (const path of ['/api/stripe/webhook', '/api/stripe/connect-webhook', '/api/checkout/existing']) {
        const request = new Request(`https://${host}${path}`, { method: 'POST', headers: { host } })
        request.nextUrl = new URL(request.url)
        const response = middleware(request)
        assert.equal(response.status, apiStatus)
        assert.equal(response.headers.get('location'), null)
      }
      const catalog = new Request(`https://${host}/api/billing/plans`)
      catalog.nextUrl = new URL(catalog.url)
      assert.equal(middleware(catalog).status, 200)
    }
  }
})
