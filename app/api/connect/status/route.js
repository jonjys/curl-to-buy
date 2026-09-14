import { getSeller, updateSeller } from '../../../../lib/store'
import { recipientStatus, retrieveConnectedRecipient } from '../../../../lib/stripe-connect'
import { sellerIdFromRequest } from '../../../../lib/seller'

export const runtime = 'nodejs'

export async function GET(req) {
  const id = sellerIdFromRequest(req)
  const seller = id ? await getSeller(id) : null
  if (!seller?.stripeAccountId) return Response.json({ hasSeller: false, ready: false, feeBps: 500 })

  try {
    const account = await retrieveConnectedRecipient(seller.stripeAccountId)
    const status = recipientStatus(account)
    const ready = status.cardPayments && status.transfers
    await updateSeller(seller.id, { ...status, ready })
    return Response.json({ hasSeller: true, ready, feeBps: seller.feeBps || 500, ...status })
  } catch {
    return Response.json({ hasSeller: true, ready: false, feeBps: seller.feeBps || 500 })
  }
}
