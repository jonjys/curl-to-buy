import { put, get } from '@vercel/blob'

const prefix = 'listings/'

export async function saveListing(listing) {
  await put(`${prefix}${listing.id}.json`, JSON.stringify(listing), {
    access: 'private',
    addRandomSuffix: false,
    contentType: 'application/json',
  })
  return listing
}

export async function getListing(id) {
  if (!id || /[^a-zA-Z0-9_-]/.test(id)) return null
  try {
    const result = await get(`${prefix}${id}.json`, { access: 'private' })
    if (!result || result.statusCode !== 200) return null
    const text = await new Response(result.stream).text()
    return JSON.parse(text)
  } catch {
    return null
  }
}
