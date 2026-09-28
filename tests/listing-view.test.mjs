// Buyer page, share image and public image contracts. Hermetic: memory Blob, no network.
import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime } from './integration-helper.mjs'

// Route code runs in a vm context, so compare values, not prototypes.
const same = (actual, expected, message) => assert.equal(JSON.stringify(actual), JSON.stringify(expected), message)

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

test('multi-file listing shows count, formats and size but not names; image is served by our own route', async () => {
  const listing = { id: 'multi_link_00001', name: 'Presets', files: [
    { name: 'jane-doe-portrait.zip', size: 3 * 1024 * 1024, blobPathname: 'uploads/b/jane-doe-portrait.zip' },
    { name: 'guide.pdf', size: 1024 * 1024, blobPathname: 'uploads/b/guide.pdf' },
  ], priceUsd: 19, priceCents: 1900, currency: 'usd', downloadsPerFile: 3,
  imagePath: 'listing-images/s1/0123456789abcdef.jpg', imageType: 'image/jpeg', sellerId: 's1', paymentAccountId: 'acct_x' }
  const { buyerListing } = await view([listing])
  const { listing: out } = await buyerListing(listing.id)
  same(out.files, { count: 2, types: ['ZIP', 'PDF'], size: '4.0 MB' })
  assert.equal(out.imageUrl, '/dl/multi_link_00001/image')
  assert.equal(out.downloadsPerFile, 3)
  for (const secret of ['jane-doe', 'listing-images/', 'uploads/']) assert.equal(JSON.stringify(out).includes(secret), false, secret)
})

test('only our image paths or legacy public item photos are used; anything else is dropped', async () => {
  const base = { priceUsd: 10, priceCents: 1000, currency: 'usd', files: [{ name: 'a.zip', size: 1 }] }
  const { buyerListing } = await view([
    { ...base, id: 'bad_cover_000001', name: 'x', coverUrl: 'http://169.254.169.254/latest/meta-data' },
    { ...base, id: 'bad_cover_000002', name: 'x', imagePath: 'uploads/b/paid-file.jpg' },
    { ...base, id: 'bad_cover_000003', name: 'x', imagePath: 'listing-images/../uploads/b/paid.jpg' },
    { ...base, id: 'bad_cover_000004', name: 'x', photoUrl: PHOTO },
    { ...base, id: 'item_photo_00001', name: 'x', kind: 'physical', photoUrl: PHOTO },
    { ...base, id: 'item_photo_00002', name: 'x', kind: 'physical', photoUrl: 'https://evil.example/uploads/items/x.jpg' },
  ])
  for (const id of ['bad_cover_000001', 'bad_cover_000002', 'bad_cover_000003', 'bad_cover_000004', 'item_photo_00002']) {
    assert.equal((await buyerListing(id)).listing.imageUrl, null, id)
  }
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

test('upload tokens are always private; image staging is limited to small images', async () => {
  let policy
  const app = runtime({ mocks: {
    '@vercel/blob/client': { handleUpload: async ({ body, onBeforeGenerateToken }) => { policy = await onBeforeGenerateToken(body.pathname); return {} } },
  } })
  const { POST } = await app.load('app/api/upload-url/route.js')
  const ask = (pathname) => POST(new Request('https://example.test/api/upload-url', { method: 'POST', body: JSON.stringify({ pathname }) }))
  await ask('uploads/image-staging/b/cover.jpg')
  assert.equal(policy.access, 'private')
  same(policy.allowedContentTypes, ['image/jpeg', 'image/png', 'image/webp'])
  assert.equal(policy.maximumSizeInBytes, 8 * 1024 * 1024)
  for (const path of ['uploads/items/r/item.png', 'uploads/covers/b/cover.jpg', 'uploads/b/file.zip', 'listing-images/s/x.jpg', '']) {
    await ask(path)
    assert.equal(policy.access, 'private', path)
    assert.equal(policy.allowedContentTypes, undefined, path)
  }

  const { legacyPhotoUrl } = await app.load('lib/public-image.js')
  assert.equal(legacyPhotoUrl(PHOTO), PHOTO)
  for (const url of [
    'http://abc.public.blob.vercel-storage.com/uploads/items/x.jpg',
    'https://abc.private.blob.vercel-storage.com/uploads/items/x.jpg',
    'https://evil.example/uploads/items/x.jpg',
    'https://abc.public.blob.vercel-storage.com.evil.example/uploads/items/x.jpg',
    'https://abc.public.blob.vercel-storage.com/uploads/b/paid.jpg',
    'https://abc.public.blob.vercel-storage.com/uploads/items/../b/paid.jpg',
    'not a url', null,
  ]) assert.equal(legacyPhotoUrl(url), null, String(url))
})
