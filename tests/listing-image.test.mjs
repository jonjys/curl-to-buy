// Listing images: server-side metadata removal, staged -> published flow, image route.
// Hermetic: memory Blob, mocked Stripe seller, no network.
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { runtime } from './integration-helper.mjs'

const SECRET = 'SECRET-GPS-59.3293N-Canon-EOS-JaneDoe'
const enc = (text) => [...Buffer.from(text, 'latin1')]
const has = (bytes, text) => Buffer.from(bytes).toString('latin1').includes(text)
const u16 = (n) => [(n >> 8) & 255, n & 255]
const u32be = (n) => [(n >>> 24) & 255, (n >> 16) & 255, (n >> 8) & 255, n & 255]
const u32le = (n) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]
const seg = (marker, payload) => [0xff, marker, ...u16(payload.length + 2), ...payload]

function jpegWithMetadata() {
  return Uint8Array.from([
    0xff, 0xd8,
    ...seg(0xe0, enc('JFIF\0\x01\x01\0\0\x01\0\x01\0\0')),
    ...seg(0xe1, enc(`Exif\0\0MM\0*${SECRET}`)),
    ...seg(0xe1, enc(`http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>${SECRET}</x:xmpmeta>`)),
    ...seg(0xe2, enc(`ICC_PROFILE\0${SECRET}`)),
    ...seg(0xed, enc(`Photoshop 3.0\0${SECRET}`)),
    ...seg(0xee, enc('Adobe\0d\0\0\0\0\x01')),
    ...seg(0xfe, enc(`comment ${SECRET}`)),
    ...seg(0xdb, new Array(65).fill(1)),
    ...seg(0xc0, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]),
    ...seg(0xda, [1, 1, 0, 0, 63, 0]),
    0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56,
    0xff, 0xd9,
    ...enc(`trailer ${SECRET}`),
  ])
}

function pngChunk(type, data) { return [...u32be(data.length), ...enc(type), ...data, 0, 0, 0, 0] }
function pngWithMetadata() {
  return Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...pngChunk('IHDR', [0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
    ...pngChunk('tEXt', enc(`Author\0${SECRET}`)),
    ...pngChunk('iTXt', enc(`XML:com.adobe.xmp\0\0\0\0\0${SECRET}`)),
    ...pngChunk('eXIf', enc(`MM\0*${SECRET}`)),
    ...pngChunk('tIME', [7, 234, 9, 28, 10, 0, 0]),
    ...pngChunk('IDAT', [1, 2, 3]),
    ...pngChunk('IEND', []),
    ...enc(`trailer ${SECRET}`),
  ])
}

function webpChunk(type, data) { return [...enc(type), ...u32le(data.length), ...data, ...(data.length % 2 ? [0] : [])] }
function webpWithMetadata() {
  const body = [
    ...webpChunk('VP8X', [0x20 | 0x08 | 0x04, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    ...webpChunk('ICCP', enc(SECRET)),
    ...webpChunk('VP8 ', [1, 2, 3, 4, 5]),
    ...webpChunk('EXIF', enc(`MM\0*${SECRET}`)),
    ...webpChunk('XMP ', enc(`<x:xmpmeta>${SECRET}</x:xmpmeta>`)),
  ]
  return Uint8Array.from([...enc('RIFF'), ...u32le(4 + body.length), ...enc('WEBP'), ...body])
}

test('server removes EXIF, XMP, ICC, IPTC, comments, text chunks and trailing data from JPEG, PNG and WebP', async () => {
  const { stripImageMetadata, sniffImage } = await runtime().load('lib/image-meta.js')
  for (const [name, input, type] of [['jpeg', jpegWithMetadata(), 'image/jpeg'], ['png', pngWithMetadata(), 'image/png'], ['webp', webpWithMetadata(), 'image/webp']]) {
    assert.ok(has(input, SECRET), name)
    const out = stripImageMetadata(input)
    assert.equal(out.type, type, name)
    assert.equal(has(out.bytes, SECRET), false, `${name} still contains metadata`)
    assert.equal(sniffImage(out.bytes), type, `${name} is still a ${type}`)
  }
  const jpeg = stripImageMetadata(jpegWithMetadata()).bytes
  assert.ok(has(jpeg, 'JFIF') && has(jpeg, 'Adobe'), 'decode-relevant APP0/APP14 kept')
  assert.deepEqual([...jpeg.slice(-2)], [0xff, 0xd9])
  assert.ok(has(jpeg, '\x12\xff\x00\x34\xff\xd0\x56'), 'entropy data kept byte for byte')
  const png = stripImageMetadata(pngWithMetadata()).bytes
  for (const kept of ['IHDR', 'IDAT', 'IEND']) assert.ok(has(png, kept), kept)
  for (const dropped of ['tEXt', 'iTXt', 'eXIf', 'tIME']) assert.equal(has(png, dropped), false, dropped)
  const webp = stripImageMetadata(webpWithMetadata()).bytes
  assert.equal(webp[20] & (0x20 | 0x08 | 0x04), 0, 'VP8X metadata flags cleared')
  assert.equal(Buffer.from(webp).readUInt32LE(4), webp.length - 8, 'RIFF size rewritten')
  for (const bad of [Uint8Array.from(enc('<svg onload=alert(1)>')), Uint8Array.from(enc('%PDF-1.7')), jpegWithMetadata().slice(0, 40), new Uint8Array()]) {
    assert.throws(() => stripImageMetadata(bad), /image/i)
  }
})

function sellerApp() {
  const seller = { id: 'seller1', email: 'seller@example.test', paymentAccountId: 'acct_merchant', billingIdentity: { customer_account: 'acct_merchant' }, feeBps: 500 }
  const app = runtime({
    client: { checkout: { sessions: { create: async () => ({}) } } },
    mocks: {
      react: { cache: (fn) => fn },
      'lib/billing.js': { billingState: async () => ({ active: false }) },
      'lib/commerce-store.js': {
        listingIdFor: (sellerId, requestId) => `L${requestId.replace(/-/g, '')}`.slice(0, 40),
        reserveLink: async () => {}, withBillingLock: async (_key, fn) => fn(),
      },
      'lib/stripe-connect.js': { loadReadySeller: async () => seller },
    },
  })
  return { app, seller }
}

async function register(app, extras) {
  const route = await app.load('app/api/register/route.js')
  const requestId = extras.requestId || randomUUID()
  const response = await route.POST(new Request('https://app.test/api/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId, accepted: true, locale: 'en', title: 'Pack', priceUsd: 10,
      files: [{ name: 'pack.zip', blobPathname: 'uploads/b/pack.zip', size: 12, type: 'application/zip' }],
      ...extras,
    }),
  }))
  return { response, requestId }
}

test('staged cover -> cleaned private listing image -> served only by /dl/[id]/image; staging is consumed', async () => {
  const { app } = sellerApp()
  const staged = 'uploads/image-staging/b/cover-Ab12.jpg'
  await app.blob.put(staged, jpegWithMetadata(), {})
  const { response, requestId } = await register(app, { imageUpload: staged })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.imageUrl, `/dl/${body.id}/image`)
  const listing = await (await app.load('lib/store.js')).getListing(body.id)
  assert.equal(listing.imagePath, `listing-images/seller1/${requestId}.jpg`)
  assert.equal(listing.imageType, 'image/jpeg')
  assert.equal(app.blob.data.has(staged), false, 'staged upload deleted')
  assert.equal(has(app.blob.data.get(listing.imagePath).text, SECRET), false, 'stored image has no metadata')

  const { GET } = await app.load('app/dl/[id]/image/route.js')
  const served = await GET(new Request(`https://app.test/dl/${body.id}/image`), { params: Promise.resolve({ id: body.id }) })
  assert.equal(served.status, 200)
  assert.equal(served.headers.get('content-type'), 'image/jpeg')
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(has(new Uint8Array(await served.arrayBuffer()), SECRET), false)

  // Retrying the same request after the staged file was consumed keeps the image.
  const retry = await register(app, { imageUpload: staged, requestId })
  assert.equal(retry.response.status, 200)
  assert.equal((await retry.response.json()).imageUrl, `/dl/${body.id}/image`)
})

test('a paid file, a non-staging path, a non-image or a missing upload can never become the listing image', async () => {
  const { app } = sellerApp()
  await app.blob.put('uploads/image-staging/b/fake.jpg', '%PDF-1.7 secret paid content', {})
  await app.blob.put('uploads/b/pack.zip', 'PK paid zip', {})
  // A real image that the seller also lists as a paid file: only the paid-file check can stop it.
  await app.blob.put('uploads/image-staging/b/cover.jpg', jpegWithMetadata(), {})
  const cases = [
    { imageUpload: 'uploads/b/pack.zip' },
    { imageUpload: 'uploads/image-staging/b/cover.jpg', files: [{ name: 'c.jpg', blobPathname: 'uploads/image-staging/b/cover.jpg', size: 12, type: 'image/jpeg' }] },
    { imageUpload: 'uploads/image-staging/../b/pack.zip' },
    { imageUpload: 'https://abc.public.blob.vercel-storage.com/uploads/items/x.jpg' },
    { imageUpload: 'uploads/image-staging/b/fake.jpg' },
    { imageUpload: 'uploads/image-staging/b/missing.jpg' },
  ]
  for (const extras of cases) {
    const { response } = await register(app, extras)
    assert.equal(response.status, 400, JSON.stringify(extras))
  }
  assert.equal([...app.blob.data.keys()].some((key) => key.startsWith('listing-images/')), false)
  assert.equal([...app.blob.data.keys()].some((key) => key.startsWith('listings/')), false, 'no listing saved')

  const { GET } = await app.load('app/dl/[id]/image/route.js')
  await app.blob.put('listings/nopic_000000001.json', JSON.stringify({ id: 'nopic_000000001', name: 'x', imagePath: 'uploads/b/pack.zip' }), {})
  const served = await GET(new Request('https://app.test/dl/nopic_000000001/image'), { params: Promise.resolve({ id: 'nopic_000000001' }) })
  assert.equal(served.status, 404, 'a paid file path in a record is never served')
  const missing = await GET(new Request('https://app.test/dl/missing_00000001/image'), { params: Promise.resolve({ id: 'missing_00000001' }) })
  assert.equal(missing.status, 404)
})
