import { stripe } from '../../../../lib/stripe'
import { getSeller } from '../../../../lib/store'
import { SITE } from '../../../../lib/site'
import { currentSellerFromRequest } from '../../../../lib/seller'

export const runtime = 'nodejs'

// This is the account_link.refresh_url target: Stripe sends the seller's
// browser here (a real navigation, not a fetch) when an onboarding link has
// expired. It must issue a redirect to a fresh link — never JSON, which the
// browser would just render as text.
export async function GET(req) {
  const client = stripe()
  const seller = await currentSellerFromRequest(req, { getSeller })
  if (!client || !seller?.stripeAccountId) {
    return Response.redirect(`${SITE}/seller`, 302)
  }
  try {
    const link = await client.accountLinks.create({
      account: seller.stripeAccountId,
      refresh_url: `${SITE}/api/connect/refresh`,
      return_url: `${SITE}/seller`,
      type: 'account_onboarding',
    })
    return Response.redirect(link.url, 302)
  } catch {
    return Response.redirect(`${SITE}/seller`, 302)
  }
}
