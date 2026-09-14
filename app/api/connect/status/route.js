import { getSeller, saveSellerEmailIndex, updateSeller } from '../../../../lib/store'
import { recipientStatus, retrieveConnectedRecipient } from '../../../../lib/stripe-connect'
import { emailKey, sellerIdFromRequest } from '../../../../lib/seller'

export const runtime = 'nodejs'

export async function GET(req) {
  const id = sellerIdFromRequest(req)
  const seller = id ? await getSeller(id) : null
  if (!seller?.stripeAccountId) return Response.json({ hasSeller: false, ready: false, feeBps: 500 })

  try {
    const account = await retrieveConnectedRecipient(seller.stripeAccountId)
    const status = recipientStatus(account)
    const ready = status.transfers
    await updateSeller(seller.id, { ...status, ready })
    // Backfill the email→seller index for accounts created before recovery
    // existed, so a later cross-device recovery request finds them too.
    if (seller.email) await saveSellerEmailIndex(emailKey(seller.email), seller.id)
    return Response.json({ hasSeller: true, ready, feeBps: seller.feeBps || 500, ...status })
  } catch {
    return Response.json({ hasSeller: true, ready: Boolean(seller.ready), feeBps: seller.feeBps || 500 })
  }
}
