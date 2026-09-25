import { getSeller, saveSeller, saveSellerEmailIndex, getSellerIdByEmail, assertPrivateBlobAccess } from '../../../lib/store'
import { createSubscriptionMerchant, merchantOnboardingLink, startOnboarding } from '../../../lib/stripe-connect'
import { emailKey, feeBpsForEmail, newSellerId, sellerCookie, sellerIdFromRequest, validSellerEmail } from '../../../lib/seller'
import { clientError, sameOrigin } from '../../../lib/http'
import { httpsOrigin } from '../../../lib/site'

export const runtime = 'nodejs'

function returnToFrom(body) {
  return body?.returnTo === 'plans' ? 'plans' : 'sell'
}

export async function POST(req) {
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin.' }, { status: 403 })
  try {
    await assertPrivateBlobAccess()
    const body = await req.json().catch(() => ({}))
    const returnTo = returnToFrom(body)
    const existingId = sellerIdFromRequest(req)
    let seller = existingId ? await getSeller(existingId) : null

    if (!seller) {
      const email = validSellerEmail(body.email)
      if (!email) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
      if (await getSellerIdByEmail(emailKey(email))) {
        return Response.json({ error: 'An existing seller uses this email. Recover your seller access by email.', needsRecovery: true }, { status: 409 })
      }
      const id = newSellerId()
      const account = await createSubscriptionMerchant({ email, sellerId: id })
      seller = {
        id,
        email,
        stripeAccountId: account.id,
        paymentAccountId: account.id,
        connectVersion: account.connectVersion || 'v2',
        feeBps: feeBpsForEmail(email),
        onboardingReturn: returnTo,
        ready: false,
        createdAt: Date.now(),
      }
      await saveSeller(seller)
      await saveSellerEmailIndex(emailKey(email), id)
      const origin = httpsOrigin(req)
      const link = await merchantOnboardingLink(account.id, origin, account, returnTo)
      if (!link?.url) return Response.json({ error: 'Stripe did not return an onboarding URL.' }, { status: 502 })
      const response = Response.json({ url: link.url, source: link.source || 'v2' })
      response.headers.append('Set-Cookie', sellerCookie(id))
      return response
    }

    const started = await startOnboarding(seller, httpsOrigin(req), returnTo)
    return Response.json({ url: started.url, source: started.source || 'v2', ready: Boolean(started.ready) })
  } catch (error) {
    console.error('Seller Stripe setup failed', { type: error.type || error.name, code: error.code })
    const failure = clientError(error, 'Could not start Stripe setup. Please try again.')
    return Response.json({ error: failure.error }, { status: failure.status })
  }
}
