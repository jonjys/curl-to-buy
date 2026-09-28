// Server-side metadata removal for listing images, without re-encoding.
// Only the pixel data and the few chunks needed to display it are copied;
// EXIF, XMP, IPTC, ICC, comments and text chunks (GPS, camera, owner, dates)
// are dropped, and anything after the end of the image is discarded.

export const IMAGE_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

function fail(message = 'Unsupported or damaged image.') {
  throw Object.assign(new Error(message), { status: 400 })
}

export function sniffImage(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length > 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)) return 'image/png'
  const ascii = (from, to) => String.fromCharCode(...bytes.subarray(from, to))
  if (bytes.length > 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}

function concat(parts) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let offset = 0
  for (const part of parts) { out.set(part, offset); offset += part.length }
  return out
}

function stripJpeg(bytes) {
  const parts = [bytes.subarray(0, 2)]
  let i = 2
  while (i + 1 < bytes.length) {
    if (bytes[i] !== 0xff) fail()
    let marker = bytes[i + 1]
    while (marker === 0xff && i + 2 < bytes.length) { i++; marker = bytes[i + 1] }
    if (marker === 0xd9) { parts.push(Uint8Array.of(0xff, 0xd9)); return concat(parts) }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { parts.push(bytes.subarray(i, i + 2)); i += 2; continue }
    if (i + 3 >= bytes.length) fail()
    const end = i + 2 + ((bytes[i + 2] << 8) | bytes[i + 3])
    if (end > bytes.length) fail()
    // APP0 (JFIF) and APP14 (Adobe colour transform) are needed to decode; every
    // other APPn (EXIF, XMP, ICC, IPTC, maker notes) and COM is metadata.
    const metadata = (marker >= 0xe1 && marker <= 0xef && marker !== 0xee) || marker === 0xfe
    if (!metadata) parts.push(bytes.subarray(i, end))
    i = end
    if (marker === 0xda) {
      let j = i
      while (j + 1 < bytes.length && !(bytes[j] === 0xff && bytes[j + 1] !== 0 && !(bytes[j + 1] >= 0xd0 && bytes[j + 1] <= 0xd7))) j++
      parts.push(bytes.subarray(i, j))
      i = j
    }
  }
  fail()
}

const PNG_KEEP = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND', 'tRNS', 'gAMA', 'cHRM', 'sRGB', 'sBIT', 'pHYs'])

function stripPng(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const parts = [bytes.subarray(0, 8)]
  let i = 8
  while (i + 12 <= bytes.length) {
    const length = view.getUint32(i)
    const type = String.fromCharCode(...bytes.subarray(i + 4, i + 8))
    const end = i + 12 + length
    if (end > bytes.length) fail()
    if (PNG_KEEP.has(type)) parts.push(bytes.subarray(i, end))
    i = end
    if (type === 'IEND') return concat(parts)
  }
  fail()
}

const WEBP_KEEP = new Set(['VP8 ', 'VP8L', 'VP8X', 'ALPH', 'ANIM', 'ANMF'])

function stripWebp(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const riffEnd = Math.min(bytes.length, 8 + view.getUint32(4, true))
  const parts = []
  let i = 12
  while (i + 8 <= riffEnd) {
    const type = String.fromCharCode(...bytes.subarray(i, i + 4))
    const size = view.getUint32(i + 4, true)
    const end = i + 8 + size + (size % 2)
    if (i + 8 + size > riffEnd) fail()
    if (WEBP_KEEP.has(type)) {
      const chunk = bytes.slice(i, Math.min(end, riffEnd))
      // VP8X flags: clear ICC (0x20), EXIF (0x08) and XMP (0x04) since those chunks are gone.
      if (type === 'VP8X' && size >= 1) chunk[8] &= ~(0x20 | 0x08 | 0x04)
      parts.push(chunk)
    }
    i = end
  }
  if (!parts.some((chunk) => ['VP8 ', 'VP8L', 'ANMF'].includes(String.fromCharCode(...chunk.subarray(0, 4))))) fail()
  const body = concat(parts)
  const header = new Uint8Array(12)
  header.set([0x52, 0x49, 0x46, 0x46]) // RIFF
  new DataView(header.buffer).setUint32(4, 4 + body.length, true)
  header.set([0x57, 0x45, 0x42, 0x50], 8) // WEBP
  return concat([header, body])
}

export function stripImageMetadata(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input)
  const type = sniffImage(bytes)
  if (!type) fail('Use a JPG, PNG or WebP image.')
  const clean = type === 'image/jpeg' ? stripJpeg(bytes) : type === 'image/png' ? stripPng(bytes) : stripWebp(bytes)
  return { bytes: clean, type }
}
