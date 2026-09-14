import { getSeller, saveVerificationCode, getSellerIdByEmail } from '../../../../lib/store'
import { emailKey, validSellerEmail, verificationCode, verificationCodeHash } from '../../../../lib/seller'
import { emailReady, sendVerificationCode } from '../../../../lib/mailer'

export const runtime = 'nodejs'

// Best-effort, per-instance throttle — good enough to blunt a script kiddie
// without a shared store, same tradeoff the rest of this app already makes.
const rl = new Map()
function limited(key, max = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now()
  const rec = rl.get(key)
  if (!rec || now > rec.reset) {
    rl.set(key, { count: 1, reset: now + windowMs })
    return false
  }
  rec.count += 1
  return rec.count > max
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}))
  const email = validSellerEmail(body.email)
  if (!email) return Response.json({ error: 'Enter a valid email address.' }, { status: 400 })
  if (!emailReady()) return Response.json({ error: 'Email delivery is not configured yet.' }, { status: 503 })

  const hash = emailKey(email)
  if (limited(hash)) return Response.json({ error: 'Too many attempts. Try again later.' }, { status: 429 })

  const sellerId = await getSellerIdByEmail(hash)
  if (sellerId) {
    const seller = await getSeller(sellerId)
    if (seller?.stripeAccountId) {
      const code = verificationCode()
      await saveVerificationCode(hash, {
        codeHash: verificationCodeHash(email, code),
        sellerId,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
      })
      try {
        await sendVerificationCode(email, code)
      } catch (error) {
        return Response.json({ error: error.message || 'Could not send the code.' }, { status: 500 })
      }
    }
  }

  // Same response whether or not the email has an account — do not let this
  // endpoint be used to check who sells here.
  return Response.json({ ok: true })
}
