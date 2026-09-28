import { cache } from 'react'
import { getListing, getSalesCount, listingFiles } from './store'
import { displayPrice } from './price'
import { legacyPhotoUrl } from './public-image'
import { isListingImagePath } from './listing-image'

function extension(name) {
  const match = /\.([a-zA-Z0-9]{1,8})$/.exec(String(name || ''))
  return match ? match[1].toUpperCase() : null
}

export function formatBytes(bytes) {
  const n = Number(bytes) || 0
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  if (n >= 1024) return `${Math.max(1, Math.round(n / 1024))} KB`
  return n > 0 ? `${n} B` : null
}

// What a buyer may see before paying: counts, formats and total size.
// File names stay private because sellers often name deliveries after clients.
export function fileSummary(listing) {
  const files = listingFiles(listing)
  const types = [...new Set(files.map((file) => extension(file.name)).filter(Boolean))].slice(0, 4)
  const bytes = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0)
  return { count: files.length, types, size: formatBytes(bytes) }
}

// New listings serve their image through /dl/[id]/image from private storage.
// Older physical listings may still hold a public Blob photo URL.
export function listingImage(listing) {
  if (isListingImagePath(listing.imagePath)) return `/dl/${listing.id}/image`
  return listing.kind === 'physical' ? legacyPhotoUrl(listing.photoUrl) : null
}

// One blob read per request, shared by generateMetadata and the page.
export const loadListing = cache(async (id) => getListing(id))

export async function buyerListing(id) {
  const listing = await loadListing(id)
  if (!listing) return null
  const physical = listing.kind === 'physical'
  const sold = Number.isInteger(listing.salesLimit) ? await getSalesCount(id) : 0
  return {
    listing: {
      id: listing.id,
      kind: physical ? 'physical' : 'digital',
      name: listing.name,
      description: listing.description || null,
      imageUrl: listingImage(listing),
      condition: physical ? listing.condition || null : null,
      shippingIncluded: physical && listing.shippingIncluded === true,
      brand: listing.brand || null,
      deliveryEstimate: listing.deliveryEstimate || null,
      returnPolicy: listing.returnPolicy || null,
      sellerContact: listing.sellerContact || null,
      shippingCountries: listing.shippingCountries || ['SE'],
      files: physical ? { count: 0, types: [], size: null } : fileSummary(listing),
      downloadsPerFile: physical ? null : listing.downloadsPerFile ?? null,
      salesLimit: listing.salesLimit,
      sold,
      soldOut: Number.isInteger(listing.salesLimit) && sold >= listing.salesLimit,
      paused: listing.paused === true,
      variant: listing.variant || null,
      expiresAt: listing.expiresAt || null,
      expired: Number.isInteger(listing.expiresAt) && Date.now() > listing.expiresAt,
    },
    price: displayPrice(listing),
  }
}
