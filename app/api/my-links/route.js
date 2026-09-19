import { list } from '@vercel/blob'
import { getListing, getSeller } from '../../../lib/store'
import { sellerIdFromRequest } from '../../../lib/seller'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ID_FROM_PATH = /^listings\/([A-Za-z0-9_-]+)\.json$/

export async function GET(req) {
  const sellerId = sellerIdFromRequest(req)
  const seller = sellerId ? await getSeller(sellerId) : null
  if (!seller) {
    return Response.json({ error: 'Sign in as a seller first. Recover your account via email on the Create link page.' }, { status: 401, headers: { 'Cache-Control': 'private, no-store' } })
  }

  const cursor = new URL(req.url).searchParams.get('cursor') || undefined
  if (cursor && cursor.length > 2048) return Response.json({ error: 'Invalid page cursor.' }, { status: 400 })

  try {
    // Scan existing listing records, including those created before a seller dashboard existed.
    // Filtering takes place server-side after verifying the signed seller cookie.
    const page = await list({ prefix: 'listings/', limit: 50, ...(cursor ? { cursor } : {}) })
    const ids = page.blobs.map((blob) => ID_FROM_PATH.exec(blob.pathname)?.[1]).filter(Boolean)
    const records = await Promise.all(ids.map((id) => getListing(id)))
    const links = records
      .filter((item) => item?.sellerId === sellerId)
      .map((item) => ({
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
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    return Response.json({ links, nextCursor: page.hasMore ? page.cursor : null }, {
      headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    })
  } catch {
    return Response.json({ error: 'Could not load saved links. Please try again.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
