import { getSeller } from '../../../../lib/store'
import { readySubscriptionMerchant } from '../../../../lib/stripe-connect'
import { sellerIdFromRequest } from '../../../../lib/seller'
import { billingState } from '../../../../lib/billing'
import { isSubscribed, saleTerms } from '../../../../lib/entitlement'
import { clientError, privateJson } from '../../../../lib/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(req) {
  const terms = saleTerms(false)
  const base = { ready: false, subscribed: false, minUsd: terms.minUsd, minSek: terms.minSek, feeBps: terms.feeBps, presets: terms.presets }
  const id = sellerIdFromRequest(req)
  let seller = null
  try {
    seller = id ? await getSeller(id) : null
    if (!seller) return privateJson({ hasSeller: false, ...base })
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
  } catch (error) {
    const failure = clientError(error, 'Could not refresh Stripe status.')
    return privateJson({ hasSeller: Boolean(seller), ...base, error: failure.error }, failure.status)
  }
}
