import { put, get } from '@vercel/blob'

const prefix = 'listings/'

export async function saveListing(listing) {
  await put(`${prefix}${listing.id}.json`, JSON.stringify(listing), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    allowOverwrite: true,
  })
  return listing
}

export async function getListing(id) {
  if (!id || /[^a-zA-Z0-9_-]/.test(id)) return null
  try {
    const result = await get(`${prefix}${id}.json`, { access: 'public' })
    if (!result || result.statusCode !== 200) return null
    const text = await new Response(result.stream).text()
    return JSON.parse(text)
  } catch {
    return null
  }
}

// Merge fields into an existing listing and persist it. Returns the updated
// listing, or null if it no longer exists.
export async function updateListing(id, patch) {
  const listing = await getListing(id)
  if (!listing) return null
  const next = { ...listing, ...patch }
  await saveListing(next)
  return next
}
