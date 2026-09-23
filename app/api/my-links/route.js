import { list } from '@vercel/blob'
import { getListing, getSeller, getSalesCount, listSellerListingIds } from '../../../lib/store'
import { sellerIdFromRequest } from '../../../lib/seller'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ID_FROM_PATH = /^listings\/([A-Za-z0-9_-]+)\.json$/

export async function GET(req) {
  const sellerId = sellerIdFromRequest(req)
  const seller = sellerId ? await getSeller(sellerId) : null
  if (!seller) {
    return Response.json({ error: 'Sign in as a seller first. Recover your account by email on this page.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } })
  }

  const cursor = new URL(req.url).searchParams.get('cursor') || undefined
  if (cursor && cursor.length > 2048) return Response.json({ error: 'Invalid page cursor.' }, { status: 400 })

  try {
    const indexed = await listSellerListingIds(sellerId, cursor)
    let ids = indexed.ids
    let nextCursor = indexed.nextCursor
    if (!indexed.indexed) {
      const page = await list({ prefix: 'listings/', limit: 50, ...(cursor ? { cursor } : {}) })
      ids = page.blobs.map((blob) => ID_FROM_PATH.exec(blob.pathname)?.[1]).filter(Boolean)
      nextCursor = page.hasMore ? page.cursor : null
    }

    const records = await Promise.all(ids.map((id) => getListing(id)))
    const links = await Promise.all(records
      .filter((item) => item?.sellerId === sellerId)
      .map(async (item) => ({
        id: item.id,
        name: item.name,
        kind: item.kind === 'physical' ? 'physical' : 'digital',
        currency: item.currency,
        priceCents: item.priceCents,
        priceUsd: item.priceUsd,
        priceSek: item.priceSek,
        createdAt: item.createdAt || null,
        expiresAt: item.expiresAt || null,
        salesLimit: item.salesLimit ?? null,
        paused: item.paused === true,
        salesCount: await getSalesCount(item.id),
      })))
    links.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    return Response.json({ links, nextCursor }, {
      headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    })
  } catch {
    return Response.json({ error: 'Could not load saved links. Please try again.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
