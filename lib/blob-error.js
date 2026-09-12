// Turns a Vercel Blob failure into a message the seller can act on, instead of
// letting the route return an empty 500 (which surfaces in the browser as the
// cryptic "Unexpected end of JSON input").
export function storageErrorMessage(err) {
  const raw = (err && (err.message || String(err))) || ''
  if (/private store|public access on a private/i.test(raw)) {
    return 'Storage is set to private. This app needs a public Blob store — connect one and redeploy.'
  }
  if (/BLOB_READ_WRITE_TOKEN|not configured|no token|missing token/i.test(raw)) {
    return 'Storage is not configured.'
  }
  if (/too large|maximum.*size|payload/i.test(raw)) {
    return 'File is too large for storage.'
  }
  return raw ? `Could not save the file: ${raw}` : 'Could not save the file.'
}
