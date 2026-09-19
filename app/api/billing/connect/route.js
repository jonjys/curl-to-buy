import { authenticatedSeller } from '../../../../lib/billing'
import { createSubscriptionMerchant, merchantOnboardingLink, readySubscriptionMerchant } from '../../../../lib/stripe-connect'
import { getSeller, updateSeller } from '../../../../lib/store'
import { withBillingLock } from '../../../../lib/commerce-store'
import { privateJson, sameOrigin } from '../../../../lib/http'
import { originFrom } from '../../../../lib/site'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(req) {
  if (!sameOrigin(req)) return privateJson({ error: 'Invalid origin.' }, 403)
  try {
    const seller = await authenticatedSeller(req)
    if (!seller) return privateJson({ error: 'Enter your seller email first.', needsConnect: true }, 401)
    return await withBillingLock(seller.id, async () => {
      let current = await getSeller(seller.id)
      if (await readySubscriptionMerchant(current)) return privateJson({ url: `${originFrom(req)}/plans` })
      let created = null
      if (!current.paymentAccountId) {
        created = await createSubscriptionMerchant({ email: current.email, sellerId: current.id })
        current = await updateSeller(current.id, { paymentAccountId: created.id })
      }
      const link = await merchantOnboardingLink(current.paymentAccountId, originFrom(req), created)
      return privateJson({ url: link.url })
    })
  } catch (error) {
    console.error('Subscription merchant setup failed', { type: error.type || error.name })
    return privateJson({ error: 'Could not open Stripe setup. Please try again.' }, 503)
  }
}
