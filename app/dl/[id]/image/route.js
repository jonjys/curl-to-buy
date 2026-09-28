import { loadListing } from '../../../../lib/listing-view'
import { readListingImage } from '../../../../lib/listing-image'

export const runtime = 'nodejs'

// Serves only the listing's own cleaned image. Paid files live under other
// paths and are never reachable here.
export async function GET(_req, { params }) {
  const { id } = await params
  const listing = await loadListing(id).catch(() => null)
  const image = listing ? await readListingImage(listing).catch(() => null) : null
  if (!image) return new Response('Not found', { status: 404 })
  return new Response(image.bytes, {
    headers: {
      'Content-Type': image.type,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
