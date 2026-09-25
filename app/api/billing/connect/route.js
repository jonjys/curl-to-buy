import { authenticatedSeller } from '../../../../lib/billing'
import { startOnboarding } from '../../../../lib/stripe-connect'
import { assertPrivateBlobAccess } from '../../../../lib/store'
import { withBillingLock } from '../../../../lib/commerce-store'
import { clientError, privateJson, sameOrigin } from '../../../../lib/http'
import { httpsOrigin } from '../../../../lib/site'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(req) {
  if (!sameOrigin(req)) return privateJson({ error: 'Invalid origin.' }, 403)
  try {
    await assertPrivateBlobAccess()
    const seller = await authenticatedSeller(req)
    if (!seller) return privateJson({ error: 'Enter your seller email first.', needsConnect: true }, 401)
    const body = await req.json().catch(() => ({}))
    return await withBillingLock(seller.id, async () => {
      const current = await authenticatedSeller(req)
      if (!current) return privateJson({ error: 'Enter your seller email first.', needsConnect: true }, 401)
      const started = await startOnboarding(current, httpsOrigin(req), body.returnTo === 'plans' ? 'plans' : 'sell')
      return privateJson({ url: started.url, source: started.source || 'v2', ready: Boolean(started.ready) })
    })
  } catch (error) {
    console.error('Subscription merchant setup failed', { type: error.type || error.name, code: error.code })
    const failure = clientError(error, 'Could not open Stripe setup. Please try again.')
    return privateJson({ error: failure.error }, failure.status)
  }
}
