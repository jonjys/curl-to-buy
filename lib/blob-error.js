// Turns a Blob failure into a message the seller can act on, instead of a raw
// SDK error or an empty 500.
const PRIVATE_STORE_MESSAGE = 'File storage is still public. Turn on private Blob access, then try again.'

export function blobAccessError(error) {
  const raw = String(error?.message || error || '')
  if (/private access on a public store|must be configured with private access/i.test(raw)) {
    const mapped = new Error(PRIVATE_STORE_MESSAGE)
    mapped.status = 503
    mapped.code = 'blob_public_store'
    return mapped
  }
  return null
}

export function storageErrorMessage(err) {
  const mapped = blobAccessError(err)
  if (mapped) return mapped.message
  const raw = (err && (err.message || String(err))) || ''
  if (/public access on a private store/i.test(raw)) {
    return 'File storage rejected this save. Try again in a moment.'
  }
  if (/BLOB_READ_WRITE_TOKEN|not configured|no token|missing token/i.test(raw)) {
    return 'Storage is not configured.'
  }
  if (/too large|maximum.*size|payload/i.test(raw)) {
    return 'File is too large for storage.'
  }
  return 'Could not save the file.'
}
