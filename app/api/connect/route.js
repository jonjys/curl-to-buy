import { getSeller, saveSeller, saveSellerEmailIndex, getSellerIdByEmail } from '../../../lib/store'
import { createSubscriptionMerchant, merchantOnboardingLink } from '../../../lib/stripe-connect'
import { emailKey, feeBpsForEmail, newSellerId, sellerCookie, sellerIdFromRequest, validSellerEmail } from '../../../lib/seller'
import { sameOrigin } from '../../../lib/http'
import { originFrom } from '../../../lib/site'

export const runtime = 'nodejs'

export async function POST(req) {
  if (!sameOrigin(req)) return Response.json({ error: 'Invalid origin.' }, { status: 403 })
  try {
    const existingId = sellerIdFromRequest(req)
    let seller = existingId ? await getSeller(existingId) : null
    let setCookie = null
    let account = null

    if (!seller) {
      const body = await req.json().catch(() => ({}))
      const email = validSellerEmail(body.email)
      if (!email) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })

      if (await getSellerIdByEmail(emailKey(email))) return Response.json({ error: 'An existing seller uses this email. Recover your seller access by email.', needsRecovery: true }, { status: 409 })
      const id = newSellerId()
      account = await createSubscriptionMerchant({ email, sellerId: id })
      seller = {
        id,
        email,
        stripeAccountId: account.id,
        paymentAccountId: account.id,
        connectVersion: account.connectVersion || 'v2',
        feeBps: feeBpsForEmail(email),
        ready: false,
        createdAt: Date.now(),
      }
      await saveSeller(seller)
      await saveSellerEmailIndex(emailKey(email), id)
      setCookie = sellerCookie(id)
    }

    const origin = originFrom(req)
    if (!seller.paymentAccountId) return Response.json({ url: `${origin}/plans` })
    const link = await merchantOnboardingLink(seller.paymentAccountId, origin, account)
    if (!link?.url) return Response.json({ error: 'Stripe did not return an onboarding URL.' }, { status: 502 })
    const response = Response.json({ url: link.url, source: link.source || 'v2' })
    if (setCookie) response.headers.append('Set-Cookie', setCookie)
    return response
  } catch (error) {
    return Response.json({ error: error?.message || 'Could not start Stripe setup.' }, { status: 500 })
  }
}

