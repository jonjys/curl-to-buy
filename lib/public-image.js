// Public listing images (physical item photos and digital covers) live in the
// public Blob store under a fixed prefix. Anything else is rejected so a
// listing cannot point buyers or Stripe at an arbitrary host.
export const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const PUBLIC_IMAGE_PREFIXES = ['uploads/items/', 'uploads/covers/']

export function isPublicImagePath(pathname) {
  const value = String(pathname || '')
  return PUBLIC_IMAGE_PREFIXES.some((prefix) => value.startsWith(prefix))
}

export function publicImageUrl(url, prefix) {
  if (!url) return null
  try {
    const value = new URL(url)
    if (value.protocol !== 'https:' || !value.hostname.endsWith('.public.blob.vercel-storage.com')) return null
    if (!value.pathname.startsWith(`/${prefix}`)) return null
    return value.href
  } catch { return null }
}
