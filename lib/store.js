import { put, list } from '@vercel/blob'

const prefix = 'listings/'

export async function saveListing(listing) {
  await put(`${prefix}${listing.id}.json`, JSON.stringify(listing), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  })
  return listing
}

export async function getListing(id) {
  if (!id || /[^a-zA-Z0-9_-]/.test(id)) return null
  const { blobs } = await list({ prefix: `${prefix}${id}` })
  const hit = blobs.find((b) => b.pathname.endsWith(`${id}.json`))
  if (!hit) return null
  const res = await fetch(hit.url, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}
