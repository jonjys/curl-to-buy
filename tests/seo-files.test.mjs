import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime } from './integration-helper.mjs'

test('robots allows marketing pages, hides seller and buyer pages, and points to the sitemap', async () => {
  const app = runtime()
  const robots = (await app.load('app/robots.js')).default()
  assert.equal(robots.rules[0].allow, '/')
  for (const path of ['/api/', '/dl/', '/orders/', '/success', '/links', '/upload']) assert.ok(robots.rules[0].disallow.includes(path))
  assert.equal(robots.sitemap, 'https://pay.nyttolabs.com/sitemap.xml')
})

test('sitemap lists only public pages on the canonical site', async () => {
  const app = runtime()
  const urls = (await app.load('app/sitemap.js')).default().map((entry) => entry.url)
  assert.ok(urls.includes('https://pay.nyttolabs.com'))
  assert.ok(urls.includes('https://pay.nyttolabs.com/plans'))
  assert.ok(urls.every((url) => url.startsWith('https://pay.nyttolabs.com') && !/\/(api|dl|orders|upload|links)/.test(url)))
})
