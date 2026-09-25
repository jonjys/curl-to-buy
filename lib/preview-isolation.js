// This store is the existing production store, verified in Vercel on 26 Sep 2026.
// Keep it denylisted even when preview accidentally inherits Production variables.
const PRODUCTION_STORE = '2cxkdjkcxi34trtf'

export function previewIsolated(env) {
  if (env.VERCEL_ENV !== 'preview') return true
  if (!/^(?:sk|rk)_test_/.test(env.STRIPE_SECRET_KEY || '')) return false
  const token = env.BLOB_READ_WRITE_TOKEN || ''
  const match = /^vercel_blob_rw_([a-zA-Z0-9]+)_/.exec(token)
  if (!match) return false
  const store = match[1].toLowerCase()
  const expected = (env.CTB_TEST_BLOB_STORE_ID || '').replace(/^store_/, '').toLowerCase()
  return Boolean(expected && store === expected && store !== PRODUCTION_STORE)
}
