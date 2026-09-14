import { getSeller, updateSeller, getSellerIdByEmailHash, saveEmailIndex } from '../../../../lib/store'
import { currentSellerFromRequest, hashEmail, isValidEmail } from '../../../../lib/seller'

export const runtime = 'nodejs'

// Register (or change) the CALLER's own recovery email. Requires a valid
// seller cookie — this is the only time an email can be attached, so it can
// never be used to claim someone else's payout account.
export async function POST(req) {
  const seller = await currentSellerFromRequest(req, { getSeller })
  if (!seller) {
    return Response.json({ error: 'No seller session found.' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!isValidEmail(email)) {
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  const hash = hashEmail(email)
  const existingOwner = await getSellerIdByEmailHash(hash)
  if (existingOwner && existingOwner !== seller.id) {
    return Response.json({ error: 'This email is already linked to a different payout account.' }, { status: 409 })
  }
  await saveEmailIndex(hash, seller.id)
  await updateSeller(seller.id, { recoveryEmail: email, recoveryEmailHash: hash })
  return Response.json({ ok: true, email })
}
