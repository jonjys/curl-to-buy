import { stripe } from '../../../../lib/stripe'
import { getSeller, updateSeller } from '../../../../lib/store'
import { currentSellerFromRequest } from '../../../../lib/seller'

export const runtime = 'nodejs'

// Status of the CALLER's own payout account — resolved from their cookie,
// never from a listing id or any other caller-supplied identifier.
export async function GET(req) {
  const seller = await currentSellerFromRequest(req, { getSeller })
  if (!seller) {
    return Response.json({ hasSeller: false, hasAccount: false, chargesEnabled: false, payoutsEnabled: false })
  }
  const client = stripe()
  if (!client || !seller.stripeAccountId) {
    return Response.json({ hasSeller: true, hasAccount: false, chargesEnabled: false, payoutsEnabled: false })
  }
  try {
    const acct = await client.accounts.retrieve(seller.stripeAccountId)
    const chargesEnabled = Boolean(acct.charges_enabled)
    const payoutsEnabled = Boolean(acct.payouts_enabled)
    const detailsSubmitted = Boolean(acct.details_submitted)
    if (
      chargesEnabled !== seller.chargesEnabled ||
      payoutsEnabled !== seller.payoutsEnabled ||
      detailsSubmitted !== seller.detailsSubmitted
    ) {
      await updateSeller(seller.id, { chargesEnabled, payoutsEnabled, detailsSubmitted })
    }
    return Response.json({ hasSeller: true, hasAccount: true, chargesEnabled, payoutsEnabled, detailsSubmitted })
  } catch {
    return Response.json({ hasSeller: true, hasAccount: true, chargesEnabled: false, payoutsEnabled: false })
  }
}
