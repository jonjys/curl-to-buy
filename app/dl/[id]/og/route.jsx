import { ImageResponse } from 'next/og'
import { buyerListing, loadListing } from '../../../../lib/listing-view'
import { readListingImage } from '../../../../lib/listing-image'

export const runtime = 'nodejs'

const size = { width: 1200, height: 630 }
const colors = { paper: '#0c1018', sheet: '#181e2a', ink: '#eef2f6', soft: '#b4bcc8', muted: '#8b95a5', line: '#2a3344', pine: '#1aa876', pineFg: '#06140f' }

function clip(text, max) {
  const value = String(text || '')
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value
}

// The image renderer decodes PNG and JPEG reliably; WebP falls back to the
// text-only card. New images are read from private storage and inlined, so
// the renderer never fetches a URL; legacy photos are pre-validated URLs.
async function renderableImage(id, imageUrl) {
  const stored = await readListingImage(await loadListing(id)).catch(() => null)
  if (stored) {
    return /^image\/(png|jpeg)$/.test(stored.type) ? `data:${stored.type};base64,${Buffer.from(stored.bytes).toString('base64')}` : null
  }
  return imageUrl && /^https:/.test(imageUrl) && /\.(png|jpe?g)$/i.test(new URL(imageUrl).pathname) ? imageUrl : null
}

export async function GET(_req, { params }) {
  const { id } = await params
  const view = await buyerListing(id).catch(() => null)
  if (!view) return new Response('Not found', { status: 404 })
  const { listing, price } = view
  const physical = listing.kind === 'physical'
  const image = await renderableImage(id, listing.imageUrl)
  const unavailable = listing.paused ? 'Paused' : listing.soldOut ? (physical ? 'Sold' : 'Sold out') : listing.expired ? 'Offer ended' : null
  const detail = physical
    ? 'Shipping included · Pay by card'
    : [listing.files.count === 1 ? '1 file' : `${listing.files.count} files`, listing.files.types.join(', '), 'Instant download'].filter(Boolean).join(' · ')

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: colors.paper, color: colors.ink, fontFamily: 'sans-serif' }}>
        {image ? (
          <div style={{ display: 'flex', width: 540, height: '100%', background: colors.sheet, alignItems: 'center', justifyContent: 'center', borderRight: `2px solid ${colors.line}` }}>
            <img src={image} alt="" width={540} height={630} style={{ width: 540, height: 630, objectFit: 'cover' }} />
          </div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, padding: '64px 64px 56px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 24, letterSpacing: 6, textTransform: 'uppercase', color: colors.pine }}>{physical ? 'Physical item' : 'Digital download'}</div>
            <div style={{ display: 'flex', marginTop: 24, fontSize: image ? 56 : 72, fontWeight: 800, lineHeight: 1.08 }}>{clip(listing.name, image ? 70 : 90)}</div>
            <div style={{ display: 'flex', marginTop: 20, fontSize: 28, color: colors.soft }}>{detail}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', fontSize: 96, fontWeight: 800 }}>{price.label}</div>
            <div style={{ display: 'flex', padding: '18px 30px', borderRadius: 14, background: unavailable ? colors.line : colors.pine, color: unavailable ? colors.soft : colors.pineFg, fontSize: 32, fontWeight: 700 }}>{unavailable || 'Buy now'}</div>
          </div>
          <div style={{ display: 'flex', marginTop: 28, fontSize: 22, color: colors.muted }}>Secure card payment via Stripe · Curl-to-Buy</div>
        </div>
      </div>
    ),
    { ...size, headers: { 'Cache-Control': 'public, max-age=300, s-maxage=3600' } },
  )
}
