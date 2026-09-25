import { getSeller, assertPrivateBlobAccess } from '../../../../lib/store'
import { hostedOnboardingUrl, startOnboarding } from '../../../../lib/stripe-connect'
import { sellerIdFromRequest } from '../../../../lib/seller'
import { httpsOrigin } from '../../../../lib/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function resume(origin) {
  return Response.redirect(`${origin}/?stripe=refresh`, 303)
}

// Stripe sends the browser here when an onboarding link expires or was already opened.
export async function GET(req) {
  const origin = httpsOrigin(req)
  try {
    await assertPrivateBlobAccess()
    const id = sellerIdFromRequest(req)
    const seller = id ? await getSeller(id) : null
    if (!seller) return resume(origin)
    const started = await startOnboarding(seller, origin, seller.onboardingReturn || 'sell')
    if (started.ready) return Response.redirect(started.url, 303)
    const hosted = hostedOnboardingUrl(started.url)
    if (!hosted) return resume(origin)
    return Response.redirect(hosted, 303)
  } catch (error) {
    console.error('Stripe onboarding refresh failed', { type: error.type || error.name, code: error.code })
    return resume(origin)
  }
}
