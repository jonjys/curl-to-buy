import { stripe } from '../../../../lib/stripe'
import { getListing, updateListing } from '../../../../lib/store'
import { SITE } from '../../../../lib/site'

export const runtime = 'nodejs'

// Status of the seller's payout (Connect) account for this listing.
export async function GET(_req, { params }) {
  const { id } = await params
  const client = stripe()
  if (!client) {
    return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })
  }
  const listing = await getListing(id)
  if (!listing) {
    return Response.json({ error: 'This link is not for sale.' }, { status: 404 })
  }
  if (!listing.stripeAccountId) {
    return Response.json({ hasAccount: false, chargesEnabled: false })
  }
  try {
    const acct = await client.accounts.retrieve(listing.stripeAccountId)
    const chargesEnabled = Boolean(acct.charges_enabled)
    // Cache the ready flag on the listing so checkout can trust it fast.
    if (chargesEnabled && !listing.payoutsReady) {
      await updateListing(id, { payoutsReady: true })
    }
    return Response.json({
      hasAccount: true,
      chargesEnabled,
      detailsSubmitted: Boolean(acct.details_submitted),
    })
  } catch {
    return Response.json({ hasAccount: true, chargesEnabled: false })
  }
}

// Start (or resume) Stripe Express onboarding for this listing's seller.
export async function POST(_req, { params }) {
  const { id } = await params
  const client = stripe()
  if (!client) {
    return Response.json({ error: 'Stripe is not configured.' }, { status: 500 })
  }
  const listing = await getListing(id)
  if (!listing) {
    return Response.json({ error: 'This link is not for sale.' }, { status: 404 })
  }

  let accountId = listing.stripeAccountId
  try {
    if (!accountId) {
      const account = await client.accounts.create({
        type: 'express',
        metadata: { file_id: id },
      })
      accountId = account.id
      await updateListing(id, { stripeAccountId: accountId })
    }
    const link = await client.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE}/api/connect/${id}`,
      return_url: `${SITE}/dl/${id}?payouts=done`,
      type: 'account_onboarding',
    })
    return Response.json({ url: link.url })
  } catch (err) {
    return Response.json(
      { error: err?.message || 'Could not start payout setup. Connect may not be enabled yet.' },
      { status: 500 },
    )
  }
}
