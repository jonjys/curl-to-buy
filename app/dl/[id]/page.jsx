import { notFound } from 'next/navigation'
import { LocaleProvider } from '../../../components/locale'
import { Frame } from '../../../components/shell'
import { getListing, getSalesCount, listingFiles } from '../../../lib/store'
import { displayPrice } from '../../../lib/price'
import BuyBox from './buy'

export const dynamic = 'force-dynamic'

export default async function DlPage({ params }) {
  const { id } = await params
  const listing = await getListing(id)
  if (!listing) notFound()
  const sold = Number.isInteger(listing.salesLimit) ? await getSalesCount(id) : 0
  const soldOut = Number.isInteger(listing.salesLimit) && sold >= listing.salesLimit
  const expired = Number.isInteger(listing.expiresAt) && Date.now() > listing.expiresAt
  const safeListing = {
    id: listing.id,
    kind: listing.kind === 'physical' ? 'physical' : 'digital',
    name: listing.name,
    description: listing.description || null,
    photoUrl: listing.kind === 'physical' ? listing.photoUrl || null : null,
    condition: listing.kind === 'physical' ? listing.condition || null : null,
    shippingIncluded: listing.kind === 'physical' && listing.shippingIncluded === true,
    fileCount: listing.kind === 'physical' ? 0 : listingFiles(listing).length,
    salesLimit: listing.salesLimit,
    sold,
    soldOut,
    expiresAt: listing.expiresAt || null,
    expired,
  }
  return <LocaleProvider><Frame><main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6"><BuyBox listing={safeListing} price={displayPrice(listing)} /></main></Frame></LocaleProvider>
}
