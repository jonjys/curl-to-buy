import test from 'node:test'
import assert from 'node:assert/strict'
import { runtime } from './integration-helper.mjs'

test('preview refuses live credentials, shared production storage, missing or mismatched test storage', async () => {
  const { previewIsolated } = await runtime().load('lib/preview-isolation.js')
  const isolated = { VERCEL_ENV: 'preview', STRIPE_SECRET_KEY: 'sk_test_fixture',
    BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_TestStore_fixture', CTB_TEST_BLOB_STORE_ID: 'store_TestStore' }
  assert.equal(previewIsolated(isolated), true)
  assert.equal(previewIsolated({ ...isolated, STRIPE_SECRET_KEY: 'rk_test_fixture' }), true)
  assert.equal(previewIsolated({ ...isolated, STRIPE_SECRET_KEY: 'sk_live_fixture' }), false)
  assert.equal(previewIsolated({ ...isolated, BLOB_READ_WRITE_TOKEN: '' }), false)
  assert.equal(previewIsolated({ ...isolated, CTB_TEST_BLOB_STORE_ID: '' }), false)
  assert.equal(previewIsolated({ ...isolated, CTB_TEST_BLOB_STORE_ID: 'store_other' }), false)
  assert.equal(previewIsolated({ ...isolated, BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_2cxkdjkcxi34trtf_fixture', CTB_TEST_BLOB_STORE_ID: 'store_2cxkdjkcxi34trtf' }), false)
  assert.equal(previewIsolated({ VERCEL_ENV: 'production' }), true)
  assert.equal(previewIsolated({}), true)
})
