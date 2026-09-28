import { IMAGE_TYPES, MAX_IMAGE_BYTES } from './public-image'

const MAX_EDGE = 2400

// Browser only. Shrink and re-encode listing images before the private staged
// upload, which also drops EXIF/XMP. This is a convenience, not the guarantee:
// the server removes metadata again (lib/image-meta.js) before publishing, so
// a client that skips this form still cannot publish location or camera data.
// PNG keeps transparency; everything else becomes JPEG.
export async function cleanImage(file) {
  if (!IMAGE_TYPES[file?.type]) throw new Error('Use a JPG, PNG or WebP image.')
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.9))
    if (!blob || blob.type !== type) throw new Error('Could not process the image.')
    if (blob.size > MAX_IMAGE_BYTES) throw new Error('The image is too large (max 8 MB).')
    return new File([blob], `image.${IMAGE_TYPES[type]}`, { type })
  } finally {
    bitmap.close?.()
  }
}
