// Image types the seller forms accept. Listing images are uploaded privately
// to a staging path and published by the server (see listing-image.js).
export const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024

// Older physical listings stored a public Blob photo URL. Accept only that
// exact shape so an old or hand-edited record cannot point anywhere else.
export function legacyPhotoUrl(url) {
  if (!url) return null
  try {
    const value = new URL(url)
    if (value.protocol !== 'https:' || !value.hostname.endsWith('.public.blob.vercel-storage.com')) return null
    if (!value.pathname.startsWith('/uploads/items/')) return null
    return value.href
  } catch { return null }
}
