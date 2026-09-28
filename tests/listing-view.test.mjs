// Buyer page, share image and public image contracts. Hermetic: memory Blob, no network.
import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime } from './integration-helper.mjs'

// Route code runs in a vm context, so compare values, not prototypes.
const same = (actual, expected, message) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), message)

const COVER = 'https://abc.public.blob.vercel-storage.com/uploads/covers/batch/cover-x1.jpg'
const PHOTO = 'https://abc.public.blob.vercel-storage.com/uploads/items/req/item-x1.jpg'

async function view(listings, purchases = {}) {
  const app = runtime({ mocks: { react: { cache: (fn) => fn } } })
  for (const listing of listings) await app.blob.put(`listings/${listing.id}.json`, JSON.stringify(listing), {})
  for (const [id, count] of Object.entries(purchases)) {
    for (let i = 0; i < count; i++) await app.blob.put(`purchases/${id}/cs_test_${i}.json`, '{}', {})
  }
  return app.load('lib/listing-view.js')
}

test('legacy single-file links still render and never expose file names or storage paths', async () => {
  const legacy = { id: 'legacy_link_0001', name: 'Old pack', blobPathname: 'uploads/b/client-acme-final.zip', size: 2048, priceUsd: 10, priceCents: 1000, currency: 'usd' }
  const { buyerListing } = await view([legacy])
  const result = await buyerListing(legacy.id)
  assert.equal(result.price.label, '$10')
  assert.equal(result.listing.kind, 'digital')
  same(result.listing.files, { count: 1, types: [], size: '2 KB' })
  assert.equal(result.listing.imageUrl, null)
  assert.equal(result.listing.downloadsPerFile, null)
  assert.equal(result.listing.soldOut, false)
  assert.equal(result.listing.paused, false)
  assert.equal(result.listing.expired, false)
  const json = JSON.stringify(result)
  for (const secret of ['client-acme', 'uploads/', 'blobPathname', 'sellerId', 'paymentAccountId']) assert.equal(json.includes(secret), false, secret)
})

test('multi-file listing shows count, formats and size but not names; cover must be our public cover prefix', async () => {
  const listing = { id: 'multi_link_00001', name: 'Presets', files: [
    { name: 'jane-doe-portrait.zip', size: 3 * 1024 * 1024, blobPathname: 'uploads/b/jane-doe-portrait.zip' },
    { name: 'guide.pdf', size: 1024 * 1024, blobPathname: 'uploads/b/guide.pdf' },
  ], priceUsd: 19, priceCents: 1900, currency: 'usd', downloadsPerFile: 3, coverUrl: COVER,
  sellerId: 's1', paymentAccountId: 'acct_x' }
  const { buyerListing } = await view([listing])
  const { listing: out } = await buyerListing(listing.id)
  same(out.files, { count: 2, types: ['ZIP', 'PDF'], size: '4.0 MB' })
  assert.equal(out.imageUrl, COVER)
  assert.equal(out.downloadsPerFile, 3)
  assert.equal(JSON.stringify(out).includes('jane-doe'), false)
})

test('stored image URLs outside our public prefixes are dropped before render or server-side fetch', async () => {
  const base = { priceUsd: 10, priceCents: 1000, currency: 'usd', files: [{ name: 'a.zip', size: 1 }] }
  const { buyerListing } = await view([
    { ...base, id: 'bad_cover_000001', name: 'x', coverUrl: 'http://169.254.169.254/latest/meta-data' },
    { ...base, id: 'bad_cover_000002', name: 'x', coverUrl: 'https://abc.public.blob.vercel-storage.com/uploads/b/paid-file.jpg' },
    { ...base, id: 'bad_cover_000003', name: 'x', coverUrl: PHOTO },
    { ...base, id: 'item_photo_00001', name: 'x', kind: 'physical', photoUrl: PHOTO, coverUrl: COVER },
  ])
  assert.equal((await buyerListing('bad_cover_000001')).listing.imageUrl, null)
  assert.equal((await buyerListing('bad_cover_000002')).listing.imageUrl, null)
  assert.equal((await buyerListing('bad_cover_000003')).listing.imageUrl, null)
  assert.equal((await buyerListing('item_photo_00001')).listing.imageUrl, PHOTO)
})

test('sold out, paused, expired and unknown links', async () => {
  const base = { priceUsd: 10, priceCents: 1000, currency: 'usd', files: [{ name: 'a.zip', size: 1 }] }
  const { buyerListing } = await view([
    { ...base, id: 'sold_out_000001', name: 'x', salesLimit: 2 },
    { ...base, id: 'one_left_000001', name: 'x', salesLimit: 2 },
    { ...base, id: 'paused_00000001', name: 'x', paused: true },
    { ...base, id: 'expired_0000001', name: 'x', expiresAt: Date.now() - 1000 },
    { ...base, id: 'running_0000001', name: 'x', expiresAt: Date.now() + 60_000 },
  ], { sold_out_000001: 2, one_left_000001: 1 })
  const sold = (await buyerListing('sold_out_000001')).listing
  assert.equal(sold.soldOut, true); assert.equal(sold.sold, 2)
  const oneLeft = (await buyerListing('one_left_000001')).listing
  assert.equal(oneLeft.soldOut, false); assert.equal(oneLeft.sold, 1)
  assert.equal((await buyerListing('paused_00000001')).listing.paused, true)
  assert.equal((await buyerListing('expired_0000001')).listing.expired, true)
  assert.equal((await buyerListing('running_0000001')).listing.expired, false)
  assert.equal(await buyerListing('missing_0000001'), null)
  assert.equal(await buyerListing('../listings/x'), null)
})

test('public image policy: only listing image prefixes are public, and only as images', async () => {
  let policy
  const app = runtime({ mocks: {
    '@vercel/blob/client': { handleUpload: async ({ body, onBeforeGenerateToken }) => { policy = await onBeforeGenerateToken(body.pathname); return {} } },
  } })
  const { POST } = await app.load('app/api/upload-url/route.js')
  const ask = (pathname) => POST(new Request('https://example.test/api/upload-url', { method: 'POST', body: JSON.stringify({ pathname }) }))
  await ask('uploads/covers/b/cover.jpg')
  assert.equal(policy.access, 'public')
  same(policy.allowedContentTypes, ['image/jpeg', 'image/png', 'image/webp'])
  assert.equal(policy.maximumSizeInBytes, 8 * 1024 * 1024)
  await ask('uploads/items/r/item.png')
  assert.equal(policy.access, 'public')
  assert.ok(policy.allowedContentTypes)
  for (const path of ['uploads/b/file.zip', 'uploads/b/uploads/covers/x.jpg', 'covers/x.jpg', '']) {
    await ask(path)
    assert.equal(policy.access, 'private', path)
    assert.equal(policy.allowedContentTypes, undefined, path)
  }

  const { publicImageUrl } = await app.load('lib/public-image.js')
  assert.equal(publicImageUrl(COVER, 'uploads/covers/'), COVER)
  for (const url of [
    'http://abc.public.blob.vercel-storage.com/uploads/covers/x.jpg',
    'https://abc.private.blob.vercel-storage.com/uploads/covers/x.jpg',
    'https://evil.example/uploads/covers/x.jpg',
    'https://abc.public.blob.vercel-storage.com.evil.example/uploads/covers/x.jpg',
    'https://abc.public.blob.vercel-storage.com/uploads/b/paid.jpg',
    'not a url', null,
  ]) assert.equal(publicImageUrl(url, 'uploads/covers/'), null, String(url))
})
