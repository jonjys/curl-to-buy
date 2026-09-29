// SANDBOX TEST BRANCH ONLY. Never merge.
// The isolated test Blob store is connected to Preview with the prefix
// CTB_TEST_. The app reads BLOB_READ_WRITE_TOKEN, so on Preview this points
// it at the test store. Production is untouched: VERCEL_ENV must be preview.
export function register() {
  if (process.env.VERCEL_ENV === 'preview' && process.env.CTB_TEST_BLOB_READ_WRITE_TOKEN) {
    process.env.BLOB_READ_WRITE_TOKEN = process.env.CTB_TEST_BLOB_READ_WRITE_TOKEN
  }
}
