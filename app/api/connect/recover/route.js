import { getRecoveryToken, saveRecoveryToken, getSeller, updateSeller } from '../../../../lib/store'
import { newSellerSecret, hashSecret, cookieValue, sellerCookieHeader } from '../../../../lib/seller'
import { SITE } from '../../../../lib/site'

export const runtime = 'nodejs'

// The link a seller clicks from the recovery email. Verifies the token,
// consumes it (single use), then ROTATES the seller's secret rather than
// trying to hand back the original one — we only ever stored its hash, so
// this is also what we want: the lost device's old cookie stops working the
// moment recovery succeeds.
export async function GET(req) {
  const token = new URL(req.url).searchParams.get('token') || ''

  const record = await getRecoveryToken(token)
  if (!record || record.used || Date.now() > record.expiresAt) {
    return Response.redirect(`${SITE}/seller/recover?error=invalid`, 302)
  }
  // Best-effort single-use mark. Vercel Blob has no compare-and-swap, so a
  // token replayed within the same instant (not a realistic email-link
  // scenario) isn't perfectly race-proof — documented, not hidden.
  await saveRecoveryToken(token, { ...record, used: true })

  const seller = await getSeller(record.sellerId)
  if (!seller) {
    return Response.redirect(`${SITE}/seller/recover?error=invalid`, 302)
  }

  const newSecret = newSellerSecret()
  await updateSeller(seller.id, { secretHash: hashSecret(newSecret) })

  const res = Response.redirect(`${SITE}/seller`, 302)
  res.headers.append('Set-Cookie', sellerCookieHeader(cookieValue(seller.id, newSecret)))
  return res
}
