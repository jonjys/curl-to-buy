import { authenticatedSeller, billingState, billingEnabled } from '../../../../lib/billing'
import { readySubscriptionMerchant } from '../../../../lib/stripe-connect'
import { linkUsage } from '../../../../lib/commerce-store'
import { privateJson } from '../../../../lib/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(req) {
  try {
    const seller = await authenticatedSeller(req)
    if (!seller) return privateJson({ authenticated: false, subscription: null, merchantReady: false })
    const [billing, merchant] = await Promise.all([billingState(seller), readySubscriptionMerchant(seller)])
    return privateJson({ authenticated: true, merchantReady: Boolean(merchant), acceptingSubscriptions: billingEnabled(),
      subscription: billing.subscriptionId ? { plan: billing.plan.key, name: billing.plan.name, status: billing.status,
        monthlyLinks: billing.plan.links, used: await linkUsage(seller.id, billing), periodEnd: billing.periodEnd,
        cancelAtPeriodEnd: billing.cancelAtPeriodEnd } : null })
  } catch { return privateJson({ error: 'Could not load your subscription.' }, 503) }
}
