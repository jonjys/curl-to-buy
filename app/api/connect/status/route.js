import { getSeller } from '../../../../lib/store'
import { readySubscriptionMerchant } from '../../../../lib/stripe-connect'
import { sellerIdFromRequest } from '../../../../lib/seller'
import { privateJson } from '../../../../lib/http'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function GET(req) {
  const id = sellerIdFromRequest(req)
  const seller = id ? await getSeller(id) : null
  if (!seller) return privateJson({ hasSeller: false, ready: false })
  try { return privateJson({ hasSeller: true, ready: Boolean(await readySubscriptionMerchant(seller)) }) }
  catch { return privateJson({ hasSeller: true, ready: false, error: 'Could not refresh Stripe status.' }, 503) }
}
