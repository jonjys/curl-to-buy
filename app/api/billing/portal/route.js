import { stripe } from '../../../../lib/stripe'
import { authenticatedSeller, portalConfiguration } from '../../../../lib/billing'
import { originFrom } from '../../../../lib/site'
import { privateJson, sameOrigin } from '../../../../lib/http'

export const runtime = 'nodejs'
export async function POST(req) {
  if (!sameOrigin(req)) return privateJson({ error: 'Invalid origin.' }, 403)
  try {
    const seller = await authenticatedSeller(req)
    if (!seller?.billingIdentity) return privateJson({ error: 'Choose a plan first.' }, 403)
    const configuration = portalConfiguration()
    if (!configuration) return privateJson({ error: 'Billing management is temporarily unavailable.' }, 503)
    const session = await stripe().billingPortal.sessions.create({
      ...seller.billingIdentity, configuration, return_url: `${originFrom(req)}/plans`,
    })
    return privateJson({ url: session.url })
  } catch { return privateJson({ error: 'Could not open billing.' }, 503) }
}
