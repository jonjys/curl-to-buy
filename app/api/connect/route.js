import { getSeller, saveSeller } from '../../../lib/store'
import { createConnectedRecipient, createOnboardingLink } from '../../../lib/stripe-connect'
import { feeBpsForEmail, newSellerId, sellerCookie, sellerIdFromRequest, validSellerEmail } from '../../../lib/seller'
import { SITE } from '../../../lib/site'

export const runtime = 'nodejs'

export async function POST(req) {
  try {
    const existingId = sellerIdFromRequest(req)
    let seller = existingId ? await getSeller(existingId) : null
    let setCookie = null

    if (!seller) {
      const body = await req.json().catch(() => ({}))
      const email = validSellerEmail(body.email)
      if (!email) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })

      const id = newSellerId()
      const account = await createConnectedRecipient({ email, sellerId: id })
      seller = {
        id,
        email,
        stripeAccountId: account.id,
        feeBps: feeBpsForEmail(email),
        createdAt: Date.now(),
      }
      await saveSeller(seller)
      setCookie = sellerCookie(id)
    }

    const link = await createOnboardingLink({
      accountId: seller.stripeAccountId,
      returnUrl: `${SITE}/upload?stripe=return`,
      refreshUrl: `${SITE}/upload?stripe=refresh`,
    })
    const response = Response.json({ url: link.url })
    if (setCookie) response.headers.append('Set-Cookie', setCookie)
    return response
  } catch (error) {
    return Response.json({ error: error?.message || 'Could not start Stripe setup.' }, { status: 500 })
  }
}
