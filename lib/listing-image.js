import { del, get, put } from '@vercel/blob'
import { IMAGE_EXT, stripImageMetadata } from './image-meta'

// Browsers upload listing images privately to this prefix. Only the server
// turns a staged upload into a listing image, after checking it is an image
// and removing its metadata. Nothing is ever uploaded with public access.
export const IMAGE_STAGING_PREFIX = 'uploads/image-staging/'
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const LISTING_IMAGE_PREFIX = 'listing-images/'
const PRIVATE = { access: 'private' }

function badImage(message = 'Invalid image upload. Choose the image again.') {
  return Object.assign(new Error(message), { status: 400 })
}

export function stagedImagePath(value) {
  const path = String(value || '')
  if (!path.startsWith(IMAGE_STAGING_PREFIX) || path.length > 300 || path.includes('..') || !/^[\w./-]+$/.test(path)) return null
  return path
}

async function readPrivate(pathname) {
  const result = await get(pathname, { ...PRIVATE, useCache: false }).catch(() => null)
  if (!result || result.statusCode !== 200) return null
  const bytes = new Uint8Array(await new Response(result.stream).arrayBuffer())
  return bytes
}

// Idempotent for one seller request: a retry after the staged file was
// consumed returns the image that was already published.
export async function publishListingImage(stagedValue, { sellerId, requestId, paidPaths = [] }) {
  const staged = stagedImagePath(stagedValue)
  if (!staged) throw badImage()
  // A paid file must never become a public image, even if a client asks for it.
  if (paidPaths.includes(staged)) throw badImage('The image cannot be one of the files you sell.')
  if (!/^[\w-]{1,80}$/.test(String(sellerId)) || !/^[\w-]{16,80}$/.test(String(requestId))) throw badImage()
  const base = `${LISTING_IMAGE_PREFIX}${sellerId}/${requestId}`
  const raw = await readPrivate(staged)
  if (!raw) {
    for (const [type, ext] of Object.entries(IMAGE_EXT)) {
      if (await readPrivate(`${base}.${ext}`)) return { imagePath: `${base}.${ext}`, imageType: type }
    }
    throw badImage()
  }
  if (raw.length > MAX_IMAGE_BYTES) throw badImage('The image is too large (max 8 MB).')
  const { bytes, type } = stripImageMetadata(raw)
  const imagePath = `${base}.${IMAGE_EXT[type]}`
  await put(imagePath, bytes, { ...PRIVATE, addRandomSuffix: false, allowOverwrite: true, contentType: type })
  await del(staged).catch(() => {})
  return { imagePath, imageType: type }
}

export function isListingImagePath(path) {
  return typeof path === 'string' && path.startsWith(LISTING_IMAGE_PREFIX) && !path.includes('..')
}

export async function readListingImage(listing) {
  if (!isListingImagePath(listing?.imagePath)) return null
  const bytes = await readPrivate(listing.imagePath)
  if (!bytes) return null
  return { bytes, type: IMAGE_EXT[listing.imageType] ? listing.imageType : 'application/octet-stream' }
}
