// New records are private. Listings, sellers and files written before that
// cutover remain public. A paid buyer must still be able to open them.
export async function readStoredBlob(pathname, getBlob) {
  for (const access of ['private', 'public']) {
    try {
      const result = await getBlob(pathname, { access, useCache: false })
      if (result?.statusCode === 200 && result.stream) return { result, access }
    } catch {
      // The other access mode may still hold this object.
    }
  }
  return null
}
