import { getSellerIdByEmailHash, getSeller, saveRecoveryToken } from '../../../../lib/store'
import { hashEmail, isValidEmail, newRecoveryToken } from '../../../../lib/seller'
import { sendRecoveryEmail } from '../../../../lib/mail'
import { SITE } from '../../../../lib/site'

export const runtime = 'nodejs'

const TOKEN_TTL_MS = 30 * 60 * 1000

// Public endpoint (no cookie required) — this is the whole point: it's how
// a seller who lost their cookie gets back in. Always returns the same
// generic response whether or not the email is registered, so this can't be
// used to probe which addresses have a payout account.
export async function POST(req) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const generic = Response.json({ ok: true, message: 'If that email is registered, a recovery link is on its way.' })

  if (!isValidEmail(email)) return generic

  const sellerId = await getSellerIdByEmailHash(hashEmail(email))
  if (!sellerId) return generic
  const seller = await getSeller(sellerId)
  if (!seller?.recoveryEmail) return generic

  const token = newRecoveryToken()
  await saveRecoveryToken(token, {
    sellerId,
    expiresAt: Date.now() + TOKEN_TTL_MS,
    used: false,
  })

  try {
    await sendRecoveryEmail(seller.recoveryEmail, `${SITE}/api/connect/recover?token=${token}`)
  } catch (err) {
    // Never leak delivery status to the caller (same enumeration concern as
    // above) — but this absolutely needs to be visible in server logs,
    // since a silent failure here means a seller is permanently locked out.
    console.error('[recover-request] sendRecoveryEmail failed:', err?.message || err)
  }

  return generic
}
