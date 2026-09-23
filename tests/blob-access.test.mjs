import test from 'node:test'
import assert from 'node:assert/strict'
import { readStoredBlob } from '../lib/blob-access.js'

test('reads a private object and does not fall through', async () => {
  const calls = []
  const found = await readStoredBlob('listings/new.json', async (_path, options) => {
    calls.push(options.access)
    return { statusCode: 200, stream: new Response('{"ok":true}').body, blob: { etag: '1' } }
  })
  assert.deepEqual(calls, ['private'])
  assert.equal(found.access, 'private')
  assert.equal(await new Response(found.result.stream).text(), '{"ok":true}')
})

test('falls back to a public object written before private storage', async () => {
  const calls = []
  const found = await readStoredBlob('listings/old.json', async (_path, options) => {
    calls.push(options.access)
    if (options.access === 'private') return null
    return { statusCode: 200, stream: new Response('{"old":true}').body, blob: { etag: '9' } }
  })
  assert.deepEqual(calls, ['private', 'public'])
  assert.equal(found.access, 'public')
  assert.equal(await new Response(found.result.stream).text(), '{"old":true}')
})

test('returns null when neither private nor public object exists', async () => {
  const found = await readStoredBlob('listings/missing.json', async () => {
    throw new Error('blob missing')
  })
  assert.equal(found, null)
})
