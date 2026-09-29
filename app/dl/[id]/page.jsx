import { notFound } from 'next/navigation'
import { LocaleProvider } from '../../../components/locale'
import { Frame } from '../../../components/shell'
import { buyerListing } from '../../../lib/listing-view'
import BuyBox from './buy'

export const dynamic = 'force-dynamic'

function shareDescription(listing) {
  if (listing.description) return listing.description.slice(0, 200)
  if (listing.kind === 'physical') return 'Shipping included. Pay securely by card via Stripe.'
  return 'Instant download after payment. Pay securely by card via Stripe. No account needed.'
}

// Shared links preview the product, not the platform: name, price and cover.
export async function generateMetadata({ params }) {
  const { id } = await params
  const view = await buyerListing(id).catch(() => null)
  if (!view) return { title: 'Link not found | Nytto Checkout', robots: { index: false } }
  const { listing, price } = view
  const title = `${listing.name} | ${price.label}`
  const description = shareDescription(listing)
  const image = { url: `/dl/${listing.id}/og`, width: 1200, height: 630, alt: `${listing.name}, ${price.label}` }
  return {
    title,
    description,
    openGraph: { title, description, url: `/dl/${listing.id}`, siteName: 'Nytto Checkout', type: 'website', images: [image] },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
  }
}

export default async function DlPage({ params }) {
  const { id } = await params
  const view = await buyerListing(id)
  if (!view) notFound()
  return <LocaleProvider><Frame variant="buyer"><main className="ctb-gutter mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8 sm:py-12"><BuyBox listing={view.listing} price={view.price} /></main></Frame></LocaleProvider>
}
