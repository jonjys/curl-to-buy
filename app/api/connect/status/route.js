import { getSeller, updateSeller } from '../../../../lib/store'
import { merchantStatus, retrieveConnectedMerchant } from '../../../../lib/stripe-connect'
import { sellerIdFromRequest } from '../../../../lib/seller'

export const runtime = 'nodejs'

export async function GET(req) {
  const id = sellerIdFromRequest(req)
  const seller = id ? await getSeller(id) : null
  if (!seller?.stripeAccountId) return Response.json({ hasSeller: false, ready: false, feeBps: 500 })

  try {
    const account = await retrieveConnectedMerchant(seller.stripeAccountId)
    const status = merchantStatus(account)
    const ready = status.cardPayments && status.payouts
    await updateSeller(seller.id, { ...status, ready })
    return Response.json({ hasSeller: true, ready, feeBps: seller.feeBps || 500, ...status })
  } catch {
    return Response.json({ hasSeller: true, ready: false, feeBps: seller.feeBps || 500 })
  }
}
