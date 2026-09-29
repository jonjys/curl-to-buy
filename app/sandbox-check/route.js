// SANDBOX TEST BRANCH ONLY. Never merge. Reports configuration shape, never values.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET() {
  const env = process.env
  if (env.VERCEL_ENV !== 'preview') return Response.json({ error: 'Not available.' }, { status: 404 })
  const store = /^vercel_blob_rw_([a-zA-Z0-9]+)_/.exec(env.BLOB_READ_WRITE_TOKEN || '')?.[1]?.toLowerCase() || null
  const key = env.STRIPE_SECRET_KEY || ''
  return Response.json({
    vercelEnv: env.VERCEL_ENV,
    branch: env.VERCEL_GIT_COMMIT_REF || null,
    stripeKeyMode: /^(sk|rk)_test_/.test(key) ? 'test' : /^(sk|rk)_live_/.test(key) ? 'live' : key ? 'other' : 'missing',
    blobStoreMatchesTestStore: Boolean(store && store === (env.CTB_TEST_BLOB_STORE_ID || '').replace(/^store_/, '').toLowerCase()),
    blobStoreIsProduction: store === '2cxkdjkcxi34trtf',
    has: Object.fromEntries(['STRIPE_CTB_WEBHOOK_SECRET', 'STRIPE_CTB_CONNECT_WEBHOOK_SECRET', 'STRIPE_CTB_PORTAL_CONFIGURATION', 'CTB_TEST_BLOB_READ_WRITE_TOKEN', 'CTB_TEST_BLOB_STORE_ID'].map((k) => [k, Boolean(env[k])])),
    billingEnabledFlag: env.STRIPE_CTB_BILLING_ENABLED === 'true',
  }, { headers: { 'Cache-Control': 'no-store' } })
}
