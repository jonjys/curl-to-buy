import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

async function loadRoute(dependencies) {
  const context = vm.createContext({ Response, Request, URL, console })
  const source = await readFile(new URL('../app/api/my-links/route.js', import.meta.url), 'utf8')
  const route = new vm.SourceTextModule(source, { context })
  await route.link((specifier) => {
    const exports = dependencies[specifier]
    assert.ok(exports, `Unexpected import ${specifier}`)
    return new vm.SyntheticModule(Object.keys(exports), function initialize() {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value)
    }, { context })
  })
  await route.evaluate()
  return route.namespace
}

test('saved links require signed seller account and never include another seller', async () => {
  let authorized = false
  const listings = {
    mine: { id: 'mine', sellerId: 'owner', name: 'Hoodie', kind: 'physical', priceCents: 30000, currency: 'sek' },
    theirs: { id: 'theirs', sellerId: 'someone-else', name: 'Private item', kind: 'digital', priceCents: 500, currency: 'usd' },
  }
  const dependencies = {
    '@vercel/blob': { list: async () => ({ blobs: [
      { pathname: 'listings/mine.json' }, { pathname: 'listings/theirs.json' },
    ], hasMore: false }) },
    '../../../lib/store': { getSalesCount: async () => 0, getListing: async (id) => listings[id] || null, getSeller: async (id) => id === 'owner' ? { id } : null },
    '../../../lib/seller': { sellerIdFromRequest: () => authorized ? 'owner' : null },
  }
  const route = await loadRoute(dependencies)
  assert.equal((await route.GET(new Request('https://example.test/api/my-links'))).status, 401)
  authorized = true
  const response = await route.GET(new Request('https://example.test/api/my-links'))
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control'), /no-store/)
  const body = await response.json()
  assert.deepEqual(body.links.map((link) => link.id), ['mine'])
  assert.equal(body.nextCursor, null)
  assert.equal(JSON.stringify(body).includes('someone-else'), false)
})

test('saved links page cursor scans legacy listings without mixing sellers', async () => {
  const requested = []
  const dependencies = {
    '@vercel/blob': { list: async (options) => {
      requested.push(options.cursor || null)
      return options.cursor
        ? { blobs: [{ pathname: 'listings/second.json' }], hasMore: false }
        : { blobs: [{ pathname: 'listings/first.json' }], hasMore: true, cursor: 'next_page' }
    } },
    '../../../lib/store': { getSalesCount: async () => 0,
      getSeller: async () => ({ id: 'owner' }),
      getListing: async (id) => ({ id, sellerId: 'owner', name: id, currency: 'usd', priceCents: 500 }),
    },
    '../../../lib/seller': { sellerIdFromRequest: () => 'owner' },
  }
  const route = await loadRoute(dependencies)
  const first = await (await route.GET(new Request('https://example.test/api/my-links'))).json()
  const second = await (await route.GET(new Request('https://example.test/api/my-links?cursor=next_page'))).json()
  assert.equal(first.nextCursor, 'next_page')
  assert.equal(first.links[0].id, 'first')
  assert.equal(second.nextCursor, null)
  assert.equal(second.links[0].id, 'second')
  assert.deepEqual(requested, [null, 'next_page'])
})
