import { getSeller } from '../../../../lib/store'
import { readySubscriptionMerchant } from '../../../../lib/stripe-connect'
import { sellerIdFromRequest } from '../../../../lib/seller'
import { billingState } from '../../../../lib/billing'
import { isSubscribed, saleTerms } from '../../../../lib/entitlement'
import { privateJson } from '../../../../lib/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(req) {
  const id = sellerIdFromRequest(req)
  const seller = id ? await getSeller(id) : null
  const terms = saleTerms(false)
  if (!seller) return privateJson({ hasSeller: false, ready: false, subscribed: false, minUsd: terms.minUsd, minSek: terms.minSek, feeBps: terms.feeBps, presets: terms.presets })
  try {
    const [ready, billing] = await Promise.all([
      readySubscriptionMerchant(seller),
      billingState(seller).catch(() => ({ active: false })),
    ])
    const current = saleTerms(isSubscribed(billing))
    return privateJson({
      hasSeller: true,
      ready: Boolean(ready),
      subscribed: current.subscribed,
      minUsd: current.minUsd,
      minSek: current.minSek,
      feeBps: current.feeBps,
      presets: current.presets,
    })
  } catch { return privateJson({ hasSeller: true, ready: false, subscribed: false, minUsd: terms.minUsd, minSek: terms.minSek, feeBps: terms.feeBps, presets: terms.presets, error: 'Could not refresh Stripe status.' }, 503) }
}
